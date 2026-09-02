using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

// Bootstrap only: recover packet locations from an intact video track when
// another track is unreadable. The final decrypt/remux still includes ALL tracks.
public static class BdveMp4Index
{
    public sealed class Packet
    {
        public long pos;
        public long size;
        public int stream_index;
    }

    public sealed class Track
    {
        public int index;
        public string codec_type = "video";
        public string codec_name;
    }

    public sealed class Index
    {
        public Track[] streams;
        public Packet[] packets;
    }

    private sealed class Box
    {
        public string Type;
        public int Data;
        public int End;
    }

    private const int MaximumSamples = 1000000;

    private static uint U32(byte[] bytes, int offset)
    {
        if (offset < 0 || offset > bytes.Length - 4) throw new InvalidDataException("Truncated integer.");
        return ((uint)bytes[offset] << 24) | ((uint)bytes[offset + 1] << 16) |
            ((uint)bytes[offset + 2] << 8) | bytes[offset + 3];
    }

    private static long U64(byte[] bytes, int offset)
    {
        ulong value = ((ulong)U32(bytes, offset) << 32) | U32(bytes, offset + 4);
        if (value > Int64.MaxValue) throw new InvalidDataException("Offset overflow.");
        return (long)value;
    }

    private static long Header(byte[] bytes, int offset, long remaining, byte key,
        out string type, out int headerSize)
    {
        // A header must be wholly clear or wholly XOR. Never guess a split header.
        for (int attempt = 0; attempt < 2; attempt++)
        {
            byte[] h = new byte[Math.Min(16, bytes.Length - offset)];
            for (int i = 0; i < h.Length; i++) h[i] = (byte)(bytes[offset + i] ^ (attempt == 0 ? 0 : key));
            if (h.Length < 8) break;
            bool printable = true;
            for (int i = 4; i < 8; i++) if (h[i] < 32 || h[i] > 126) printable = false;
            long size = U32(h, 0);
            headerSize = size == 1 ? 16 : 8;
            if (!printable || h.Length < headerSize) continue;
            if (size == 1)
            {
                if (U32(h, 8) > Int32.MaxValue) continue;
                size = U64(h, 8);
            }
            if (size == 0) size = remaining;
            if (size < headerSize || size > remaining) continue;
            type = Encoding.ASCII.GetString(h, 4, 4);
            return size;
        }
        throw new InvalidDataException("Unreadable MP4 box header.");
    }

    private static IEnumerable<Box> Children(byte[] bytes, int start, int end, byte key)
    {
        for (int offset = start; offset < end; )
        {
            string type;
            int headerSize;
            long size = Header(bytes, offset, end - offset, key, out type, out headerSize);
            Box box = new Box { Type = type, Data = offset + headerSize, End = offset + (int)size };
            yield return box;
            offset = box.End;
        }
    }

    private static Box Required(byte[] bytes, Box parent, string type, byte key)
    {
        Box found = null;
        foreach (Box child in Children(bytes, parent.Data, parent.End, key))
            if (child.Type == type)
            {
                if (found != null) throw new InvalidDataException("Duplicate MP4 table.");
                found = child;
            }
        if (found == null) throw new InvalidDataException("Missing MP4 table: " + type);
        return found;
    }

    private static int Count(byte[] bytes, Box box, int width, int prefix)
    {
        if (box.End - box.Data < prefix || U32(bytes, box.Data) != 0)
            throw new InvalidDataException("Unsupported or obfuscated sample table.");
        uint count = U32(bytes, box.Data + prefix - 4);
        if (count == 0 || count > MaximumSamples || (long)count * width != box.End - box.Data - prefix)
            throw new InvalidDataException("Invalid sample table length.");
        return (int)count;
    }

    private static void ReadTrack(byte[] bytes, Box trak, byte key, List<long[]> media,
        List<Track> tracks, List<Packet> packets)
    {
        Box mdia = Required(bytes, trak, "mdia", key);
        Box handler = Required(bytes, mdia, "hdlr", key);
        if (handler.End - handler.Data < 12 || Encoding.ASCII.GetString(bytes, handler.Data + 8, 4) != "vide")
            throw new InvalidDataException("Not an intact video track.");
        Box stbl = Required(bytes, Required(bytes, mdia, "minf", key), "stbl", key);
        Box stsd = Required(bytes, stbl, "stsd", key);
        if (stsd.End - stsd.Data < 16 || U32(bytes, stsd.Data) != 0 || U32(bytes, stsd.Data + 4) != 1)
            throw new InvalidDataException("Unsupported sample descriptions.");
        string codec = Encoding.ASCII.GetString(bytes, stsd.Data + 12, 4);
        if (codec != "avc1" && codec != "avc3" && codec != "hvc1" && codec != "hev1")
            throw new InvalidDataException("Unsupported video codec.");
        if (U32(bytes, stsd.Data + 8) != stsd.End - stsd.Data - 8)
            throw new InvalidDataException("Invalid sample description length.");

        Box stsz = Required(bytes, stbl, "stsz", key);
        if (stsz.End - stsz.Data < 12) throw new InvalidDataException("Truncated sample sizes.");
        uint fixedSize = U32(bytes, stsz.Data + 4);
        int sampleCount = Count(bytes, stsz, fixedSize == 0 ? 4 : 0, 12);
        Box stsc = Required(bytes, stbl, "stsc", key);
        int runCount = Count(bytes, stsc, 12, 8);
        Box offsets = null;
        foreach (Box child in Children(bytes, stbl.Data, stbl.End, key))
            if (child.Type == "stco" || child.Type == "co64")
            {
                if (offsets != null) throw new InvalidDataException("Duplicate chunk offsets.");
                offsets = child;
            }
        if (offsets == null) throw new InvalidDataException("Missing chunk offsets.");
        int width = offsets.Type == "co64" ? 8 : 4;
        int chunkCount = Count(bytes, offsets, width, 8);
        uint[] first = new uint[runCount];
        uint[] sizes = new uint[runCount];
        for (int i = 0; i < runCount; i++)
        {
            int p = stsc.Data + 8 + i * 12;
            first[i] = U32(bytes, p);
            sizes[i] = U32(bytes, p + 4);
            if (first[i] < 1 || first[i] > chunkCount || (i == 0 ? first[i] != 1 : first[i] <= first[i - 1]) ||
                sizes[i] == 0 || sizes[i] > sampleCount || U32(bytes, p + 8) != 1)
                throw new InvalidDataException("Invalid sample-to-chunk mapping.");
        }
        List<Packet> candidate = new List<Packet>();
        int run = 0;
        long previousEnd = 0;
        for (int chunk = 1; chunk <= chunkCount; chunk++)
        {
            while (run + 1 < runCount && first[run + 1] <= chunk) run++;
            int p = offsets.Data + 8 + (chunk - 1) * width;
            long position = width == 8 ? U64(bytes, p) : U32(bytes, p);
            if (position < previousEnd || candidate.Count + (long)sizes[run] > sampleCount)
                throw new InvalidDataException("Overlapping chunks or inconsistent sample count.");
            for (int sample = 0; sample < sizes[run]; sample++)
            {
                long size = fixedSize == 0 ? U32(bytes, stsz.Data + 12 + candidate.Count * 4) : fixedSize;
                bool inside = false;
                foreach (long[] range in media)
                    if (position >= range[0] && position <= range[1] && size > 0 && size <= range[1] - position)
                        inside = true;
                if (!inside) throw new InvalidDataException("Sample outside media data.");
                candidate.Add(new Packet { pos = position, size = size, stream_index = tracks.Count });
                position += size;
            }
            previousEnd = position;
        }
        if (candidate.Count != sampleCount) throw new InvalidDataException("Incomplete sample mapping.");
        tracks.Add(new Track { index = tracks.Count, codec_name = codec.StartsWith("avc") ? "h264" : "hevc" });
        packets.AddRange(candidate);
    }

    public static Index Read(string path, byte key)
    {
        byte[] moov = null;
        List<long[]> media = new List<long[]>();
        using (FileStream file = File.OpenRead(path))
        {
            long offset = 0;
            while (offset < file.Length)
            {
                file.Position = offset;
                byte[] h = new byte[(int)Math.Min(16, file.Length - offset)];
                if (file.Read(h, 0, h.Length) != h.Length) throw new InvalidDataException("Truncated header.");
                string type;
                int headerSize;
                long size = Header(h, 0, file.Length - offset, key, out type, out headerSize);
                if (type == "mdat") media.Add(new long[] { offset + headerSize, offset + size });
                if (type == "moov")
                {
                    if (moov != null || size > 64 * 1024 * 1024) throw new InvalidDataException("Unsupported movie index.");
                    moov = new byte[(int)size - headerSize];
                    file.Position = offset + headerSize;
                    if (file.Read(moov, 0, moov.Length) != moov.Length) throw new InvalidDataException("Truncated movie index.");
                }
                offset += size;
            }
        }
        if (moov == null || media.Count == 0) throw new InvalidDataException("Missing movie index or media data.");
        List<Track> tracks = new List<Track>();
        List<Packet> packets = new List<Packet>();
        // Corruption in a later sibling must not discard an already validated track.
        try
        {
            foreach (Box trak in Children(moov, 0, moov.Length, key))
                if (trak.Type == "trak")
                    try { ReadTrack(moov, trak, key, media, tracks, packets); }
                    catch (InvalidDataException) { }
        }
        catch (InvalidDataException) { }
        if (tracks.Count == 0) throw new InvalidDataException("No intact supported video sample table.");
        return new Index { streams = tracks.ToArray(), packets = packets.ToArray() };
    }
}
