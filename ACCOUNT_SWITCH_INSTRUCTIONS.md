# Claude Code Account Switcher Instructions

## Setup (One-time)

1. **Get your account tokens:**
   - Log into Account 1 on claude.ai in browser
   - Go to Settings → Copy CLI token
   - Save it somewhere (e.g., notepad)
   - Log out and log into Account 2
   - Copy CLI token for Account 2
   - Save it

2. **Make the script accessible:**
   ```bash
   # If not already done:
   chmod +x switch_account.sh
   ```

## Usage

### Quick Switch
```bash
./switch_account.sh "account1_token_here" "account2_token_here"
```

### When you hit the 5-hour limit:

1. **You'll see an error like:** "Rate limit exceeded" or "Usage limit reached"

2. **Run the script:**
   ```bash
   ./switch_account.sh "your_account1_token" "your_account2_token"
   ```

3. **The script automatically:**
   - Saves your current work to git
   - Switches to the other account
   - Shows you next steps

4. **Continue working:**
   - Script will ask if you want to start Claude Code
   - Or manually run: `claude code`

## Script Features

✅ Auto-saves work with git commit
✅ Detects which account you're currently using
✅ Switches to the other account automatically
✅ Preserves your working directory
✅ Shows clear status messages
✅ Optional auto-start of Claude Code

## Tips

- Keep both tokens in a secure note on your phone
- The script works from any directory
- Your work is always saved before switching
- Use `git log -1` to see your last saved state

## Troubleshooting

**Script not found:** Run from the correct directory or use full path
**Permission denied:** Run `chmod +x switch_account.sh`
**Auth failed:** Check your tokens are correct and not expired
**No git repo:** Work won't be auto-saved (create one with `git init`)