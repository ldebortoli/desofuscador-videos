using System;
using System.Security.Cryptography;

public static class BdvePattern
{
    // Observations may skip any number of blocks (large HEVC packets do).
    // Each E at position p requires p % step < length; P requires the opposite.
    // Only the exact BDVE configuration hash can authorize recovery.
    public static int[] Recover(byte[] hash, byte key, long[] positions, bool[] encrypted)
    {
        if (hash == null || hash.Length != 32 || positions == null || encrypted == null ||
            positions.Length != encrypted.Length || positions.Length < 20)
            throw new ArgumentException("Insufficient or invalid BDVE observations.");
        long maximumStep = Int32.MaxValue;
        bool seenPlain = false;
        for (int i = 0; i < positions.Length; i++)
        {
            if (positions[i] < 0 || (i > 0 && positions[i] <= positions[i - 1]))
                throw new ArgumentException("Observations must be ordered and unique.");
            if (!encrypted[i]) seenPlain = true;
            else if (seenPlain) maximumStep = Math.Min(maximumStep, positions[i]);
        }
        if (maximumStep == Int32.MaxValue || maximumStep > 20000000)
            throw new InvalidOperationException("No se pudo acotar el patron BDVE dentro del limite seguro de analisis.");
        byte[] config = new byte[9];
        config[8] = key;
        int tested = 0;
        long observations = 0;
        using (SHA256 sha = SHA256.Create())
        {
            for (int step = 2; step <= maximumStep; step++)
            {
                long lower = 1;
                long upper = step - 1;
                for (int i = 0; i < positions.Length && lower <= upper; i++)
                {
                    if (++observations > 200000000)
                        throw new InvalidOperationException("El patron BDVE requiere demasiadas comprobaciones para recuperarlo automaticamente.");
                    long residue = positions[i] % step;
                    if (encrypted[i]) lower = Math.Max(lower, residue + 1);
                    else upper = Math.Min(upper, residue);
                }
                if (lower > upper) continue;
                config[0] = (byte)(step >> 24);
                config[1] = (byte)(step >> 16);
                config[2] = (byte)(step >> 8);
                config[3] = (byte)step;
                for (int length = (int)lower; length <= upper; length++)
                {
                    if (++tested > 20000000)
                        throw new InvalidOperationException("La busqueda BDVE excede el limite seguro de candidatos.");
                    config[4] = (byte)(length >> 24);
                    config[5] = (byte)(length >> 16);
                    config[6] = (byte)(length >> 8);
                    config[7] = (byte)length;
                    byte[] digest = sha.ComputeHash(config);
                    bool equal = true;
                    for (int j = 0; j < hash.Length; j++)
                        if (digest[j] != hash[j]) { equal = false; break; }
                    if (equal) return new int[] { step, length, tested };
                }
            }
        }
        return new int[0];
    }
}
