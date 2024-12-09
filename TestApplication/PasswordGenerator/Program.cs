using System.Security.Cryptography;
using System.Text;

class Program
{
    // Use the same secret key as in server.js
    private static readonly string SecretKey = "SRHMonitorSecretKey2024";

    static void Main(string[] args)
    {
        Console.WriteLine("Generating One-Time Password Hashes:");

        // Create CSV file with headers
        string csvPath = "passwords.csv";
        File.WriteAllText(csvPath, "Password,Hash,Used By\n");

        string adminhash = CreateHmacHash("admin123");


        // Generate and save passwords
        for (int i = 0; i < 1000; i++)
        {
            // Generate a random 8-character password
            string password = GenerateRandomPassword();

            // Create HMAC-SHA256 hash
            string hash = CreateHmacHash(password);

            // Append to CSV
            try
            {
                File.AppendAllText(csvPath, $"{password},{hash},\n");
                
                // Also maintain the hash file for compatibility
                File.AppendAllText("passwords.hash", hash + Environment.NewLine);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\nError writing to file: {ex.Message}");
            }

            // Show progress
            if ((i + 1) % 100 == 0)
            {
                Console.WriteLine($"Generated {i + 1} passwords...");
            }
        }
        Console.WriteLine($"\nComplete! Passwords and hashes have been saved to {csvPath}");
        Console.WriteLine("Hashes have also been added to passwords.hash for compatibility");
    }

    static string GenerateRandomPassword(int length = 8)
    {
        const string uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const string lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
        const string numberChars = "0123456789";
        const string specialChars = "!@#$%&()+-[]{}<>?";

        // Ensure at least one character from each class
        char[] password = new char[length];
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
        {
            // First, add one character from each required class
            password[0] = GetRandomChar(uppercaseChars, rng);
            password[1] = GetRandomChar(lowercaseChars, rng);
            password[2] = GetRandomChar(numberChars, rng);
            password[3] = GetRandomChar(specialChars, rng);

            // Combine all character sets for remaining positions
            string allChars = uppercaseChars + lowercaseChars + numberChars;
            
            // Fill remaining positions
            for (var i = 4; i < length; i++)
            {
                password[i] = GetRandomChar(allChars, rng);
            }

            // Shuffle the entire password to avoid predictable character positions
            ShuffleArray(password, rng);
            password[length - 1] = GetRandomChar(uppercaseChars, rng);

        }

        return new string(password);
    }

    private static char GetRandomChar(string charset, System.Security.Cryptography.RandomNumberGenerator rng)
    {
        byte[] randomByte = new byte[1];
        int index;

        do
        {
            rng.GetBytes(randomByte);
            index = randomByte[0] % charset.Length;
        } while (index >= charset.Length); // Ensure no modulo bias

        return charset[index];
    }

    private static void ShuffleArray(char[] array, System.Security.Cryptography.RandomNumberGenerator rng)
    {
        int n = array.Length;
        while (n > 1)
        {
            byte[] randomByte = new byte[1];
            rng.GetBytes(randomByte);
            int k = randomByte[0] % n;
            n--;

            // Swap elements
            char temp = array[n];
            array[n] = array[k];
            array[k] = temp;
        }
    }

    static string CreateHmacHash(string password)
    {
        using (var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(SecretKey)))
        {
            byte[] passwordBytes = Encoding.UTF8.GetBytes(password);
            byte[] hashBytes = hmac.ComputeHash(passwordBytes);
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
        }
    }
}
