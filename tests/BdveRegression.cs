using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;

public static class BdveRegression
{
    private static int assertions;
    private static void Check(bool ok, string message)
    {
        if (!ok) throw new Exception(message);
        assertions++;
    }
    private static void Reject(Action action, string message)
    {
        try { action(); }
        catch (InvalidDataException) { assertions++; return; }
        catch (ArgumentException) { assertions++; return; }
        catch (InvalidOperationException) { assertions++; return; }
        throw new Exception(message);
    }
    private static byte[] Join(params byte[][] parts)
    {
        using (MemoryStream stream = new MemoryStream())
        {
            foreach (byte[] part in parts) stream.Write(part, 0, part.Length);
            return stream.ToArray();
        }
    }
    private static byte[] Words(params uint[] words)
    {
        byte[] bytes = new byte[words.Length * 4];
        for (int i = 0; i < words.Length; i++)
        {
            bytes[i * 4] = (byte)(words[i] >> 24);
            bytes[i * 4 + 1] = (byte)(words[i] >> 16);
            bytes[i * 4 + 2] = (byte)(words[i] >> 8);
            bytes[i * 4 + 3] = (byte)words[i];
        }
        return bytes;
    }
    private static byte[] Box(string type, params byte[][] payload)
    {
        byte[] body = Join(payload);
        return Join(Words((uint)body.Length + 8), Encoding.ASCII.GetBytes(type), body);
    }
    private static int Find(byte[] bytes, string type)
    {
        for (int i = 0; i <= bytes.Length - 4; i++)
            if (Encoding.ASCII.GetString(bytes, i, 4) == type) return i;
        throw new Exception("Fixture box missing: " + type);
    }
    private static void SetWord(byte[] bytes, int offset, uint word)
    {
        Array.Copy(Words(word), 0, bytes, offset, 4);
    }
    private static byte[] Fixture(bool co64, bool fixedSize, bool brokenAudio)
    {
        List<uint> sizes = new List<uint>(new uint[] { 0, fixedSize ? 60u : 0u, 24 });
        if (!fixedSize) for (uint i = 0; i < 24; i++) sizes.Add(50 + i % 3);
        List<uint> offsets = new List<uint>(new uint[] { 0, 10 });
        for (uint i = 0; i < 10; i++)
        {
            if (co64) offsets.Add(0);
            offsets.Add(32 + i * 500);
        }
        byte[] stbl = Box("stbl",
            Box("stsd", Words(0, 1), Box("hvc1")),
            Box("stsc", Words(0, 2, 1, 2, 1, 7, 3, 1)),
            Box("stsz", Words(sizes.ToArray())),
            Box(co64 ? "co64" : "stco", Words(offsets.ToArray())));
        byte[] video = Box("trak", Box("mdia",
            Box("hdlr", Words(0, 0), Encoding.ASCII.GetBytes("vide")), Box("minf", stbl)));
        byte[] audio = Box("trak", Box("mdia",
            Box("hdlr", Words(0, 0), Encoding.ASCII.GetBytes("soun")), Box("minf", stbl)));
        if (brokenAudio)
            for (int i = Find(audio, "stsc") + 20; i < audio.Length; i++) audio[i] ^= 110;
        byte[] bytes = Join(Box("ftyp", new byte[16]), Box("mdat", new byte[6000]), Box("moov", video, audio));
        for (int i = 0; i < 32; i++) bytes[i] ^= 110;
        return bytes;
    }
    private static BdveMp4Index.Index ReadFixture(string path, byte[] bytes)
    {
        File.WriteAllBytes(path, bytes);
        return BdveMp4Index.Read(path, 110);
    }
    private static byte[] Hash(int step, int length)
    {
        using (SHA256 sha = SHA256.Create()) return sha.ComputeHash(Join(Words((uint)step, (uint)length), new byte[] { 110 }));
    }
    public static string Run()
    {
        string directory = Path.Combine(Path.GetTempPath(), "bdve-regression-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        string path = Path.Combine(directory, "synthetic.mp4");
        try
        {
            foreach (bool co64 in new bool[] { false, true })
            foreach (bool fixedSize in new bool[] { false, true })
            {
                byte[] bytes = Fixture(co64, fixedSize, true);
                BdveMp4Index.Index index = ReadFixture(path, bytes);
                Check(index.streams.Length == 1 && index.streams[0].codec_name == "hevc", "Audio damage discarded intact video.");
                Check(index.packets.Length == 24, "Wrong sample count.");
                int sample = 0;
                for (int chunk = 0; chunk < 10; chunk++)
                {
                    long position = 32 + chunk * 500;
                    for (int j = 0; j < (chunk < 6 ? 2 : 3); j++)
                    {
                        int size = fixedSize ? 60 : 50 + sample % 3;
                        Check(index.packets[sample].pos == position && index.packets[sample].size == size,
                            "Incorrect stsc/stsz/chunk expansion.");
                        position += size;
                        sample++;
                    }
                }
                Check(Convert.ToBase64String(File.ReadAllBytes(path)) == Convert.ToBase64String(bytes), "Parser changed source.");
            }
            byte[] fixture = Fixture(false, false, true);
            byte[] broken = (byte[])fixture.Clone();
            SetWord(broken, Find(broken, "stsc") + 20, 1852730991);
            Reject(() => ReadFixture(path, broken), "Accepted an obfuscated sample description index.");
            broken = (byte[])fixture.Clone();
            SetWord(broken, Find(broken, "stsz") + 12, UInt32.MaxValue);
            Reject(() => ReadFixture(path, broken), "Accepted impossible sample count.");
            broken = (byte[])fixture.Clone();
            SetWord(broken, Find(broken, "stco") + 12, 0);
            Reject(() => ReadFixture(path, broken), "Accepted a sample outside mdat.");
            broken = (byte[])fixture.Clone();
            SetWord(broken, Find(broken, "stco") + 16, 32);
            Reject(() => ReadFixture(path, broken), "Accepted overlapping chunks.");
            broken = (byte[])fixture.Clone();
            SetWord(broken, Find(broken, "stsc") + 24, 1);
            Reject(() => ReadFixture(path, broken), "Accepted unsorted chunk runs.");
            broken = (byte[])fixture.Clone();
            SetWord(broken, Find(broken, "stsc") + 16, 1);
            Reject(() => ReadFixture(path, broken), "Accepted inconsistent sample totals.");
            broken = new byte[fixture.Length - 10];
            Array.Copy(fixture, broken, broken.Length);
            Reject(() => ReadFixture(path, broken), "Accepted truncated file.");
            Reject(() => ReadFixture(path, new byte[7]), "Accepted truncated header.");
            Reject(() => ReadFixture(path, Box("mdat", new byte[8])), "Accepted missing moov.");
            broken = (byte[])fixture.Clone();
            SetWord(broken, Find(broken, "hvc1"), 0x76703039); // vp09
            Reject(() => ReadFixture(path, broken), "Accepted unsupported video codec.");
            broken = Fixture(true, true, false);
            SetWord(broken, Find(broken, "co64") + 12, UInt32.MaxValue);
            Reject(() => ReadFixture(path, broken), "Accepted overflowing 64-bit offset.");

            List<long> positions = new List<long>();
            List<bool> encrypted = new List<bool>();
            for (long p = 97 * 5 + 35, i = 0; i < 120; p += 131 + (i++ % 11))
            {
                positions.Add(p);
                encrypted.Add(p % 97 < 31);
            }
            int[] recovered = BdvePattern.Recover(Hash(97, 31), 110, positions.ToArray(), encrypted.ToArray());
            Check(recovered.Length == 3 && recovered[0] == 97 && recovered[1] == 31,
                "Failed sparse observations, skipped cycles, or first sample in plaintext.");
            Check(BdvePattern.Recover(new byte[32], 110, positions.ToArray(), encrypted.ToArray()).Length == 0,
                "Accepted wrong configuration hash.");
            Reject(() => BdvePattern.Recover(new byte[4], 110, positions.ToArray(), encrypted.ToArray()), "Accepted wrong hash size.");
            Reject(() => BdvePattern.Recover(Hash(97, 31), 110, new long[19], new bool[19]), "Accepted too few observations.");
            Reject(() => BdvePattern.Recover(Hash(97, 31), 110, new long[20], new bool[20]), "Accepted duplicate positions.");
            Reject(() => BdvePattern.Recover(Hash(97, 31), 110, positions.ToArray(), new bool[120]), "Accepted no alternations.");
            Check(!encrypted[0], "Sparse regression must start in plaintext.");
            return "BDVE regression OK: " + assertions + " assertions (synthetic media only).";
        }
        finally { Directory.Delete(directory, true); }
    }
}
