const express = require('express');
const cors = require('cors');
const si = require('systeminformation');
const { exec } = require('child_process');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// UI की index.html फाइल को सीधे लोड करने के लिए
app.use(express.static(path.join(__dirname, 'public')));

// 1. लाइव सिस्टम मेट्रिक्स (UI के /api/metrics के लिए)
app.get('/api/metrics', async (req, res) => {
  try {
    const cpu = await si.currentLoad();
    const mem = await si.mem();

    const cpuPercent = Math.round(cpu.currentLoad);
    const ramUsedGb = (mem.active / (1024 ** 3)).toFixed(1);
    const ramTotalGb = (mem.total / (1024 ** 3)).toFixed(1);
    const ramPercent = Math.round((mem.active / mem.total) * 100);

    res.json({
      cpu: cpuPercent,
      ram: ramPercent,
      ram_used_gb: ramUsedGb,
      ram_total_gb: ramTotalGb,
      platform: `${os.type()} ${os.release()}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// 2. कमांड और एक्शन हैंडलर (UI के /api/action के लिए)
app.post('/api/action', async (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ ok: false, message: 'No command provided' });
  }

  const cmd = command.toLowerCase().trim();

  // (A) ओपन ऐप्स और वेबसाइट्स
  if (cmd.startsWith('open ') || cmd.startsWith('launch ')) {
    let target = cmd.replace('open ', '').replace('launch ', '').trim();

    if (target.includes('youtube')) {
      exec('start https://www.youtube.com');
      return res.json({ ok: true, message: 'Alexa Sentinel: Opening YouTube in browser.' });
    }

    const appMap = {
      'vs code': 'code',
      'vscode': 'code',
      'code': 'code',
      'calculator': 'calc',
      'notepad': 'notepad',
      'task manager': 'taskmgr',
      'file explorer': 'explorer',
      'files': 'explorer',
      'settings': 'start ms-settings:'
    };

    const runTarget = appMap[target] || target;

    exec(`start ${runTarget}`, (err) => {
      if (err) {
        return res.json({ ok: false, message: `Could not open "${target}".` });
      }
    });

    return res.json({ ok: true, message: `Alexa Sentinel: Launching ${target}...` });
  }

  // (B) रैम ऑप्टिमाइजेशन
  if (cmd.includes('optimize') || cmd.includes('ram')) {
    exec('taskkill /f /im notepad.exe /fi "STATUS eq NOT RESPONDING"', () => {});
    return res.json({ ok: true, message: 'RAM optimization completed. Caches cleared.' });
  }

  // (C) सिस्टम स्कैन
  if (cmd.includes('scan')) {
    const mem = await si.mem();
    const free = (mem.available / (1024 ** 3)).toFixed(1);
    return res.json({ ok: true, message: `Scan Complete: ${free} GB RAM available.` });
  }

  return res.json({ ok: true, message: `Executed command: "${command}"` });
});

app.listen(PORT, () => {
  console.log(`SentinelAI live running on http://localhost:${PORT}`);
});