const STORAGE_KEY = "action-points-v1";
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const todayKey = () => new Date().toLocaleDateString("sv-SE");
const nowIso = () => new Date().toISOString();
const toDateKey = (iso) => new Date(iso).toLocaleDateString("sv-SE");
const formatDateTime = (iso) => new Date(iso).toLocaleString("zh-CN", { hour12: false });
const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const defaultRewards = [
  { id: uid("reward"), title: "刷短视频 20 分钟", cost: 20, account: "instant", limit: "每天最多一次，必须计时" },
  { id: uid("reward"), title: "打一局游戏", cost: 30, account: "instant", limit: "当天核心任务完成后再兑换" },
  { id: uid("reward"), title: "喝一杯奶茶", cost: 40, account: "instant", limit: "每周最多两次" },
  { id: uid("reward"), title: "买一本书", cost: 180, account: "saving", limit: "成长型奖励" },
  { id: uid("reward"), title: "周末吃一顿好的", cost: 220, account: "saving", limit: "一周最多一次" },
  { id: uid("reward"), title: "买训练装备", cost: 600, account: "saving", limit: "月度预算内" }
];

const templates = {
  followup: { title: "给 3 个家长做回访", standard: "完成 3 个家长的有效沟通，并记录反馈。", type: "core", area: "工作发展", points: 20 },
  writing: { title: "写 500 字文章", standard: "围绕一个幼儿体能/成长主题写 500 字以上。", type: "growth", area: "写作自媒体", points: 30 },
  fitness: { title: "整理 1 个幼儿体能知识点", standard: "把一个知识点写清楚：是什么、为什么、怎么讲给家长。", type: "growth", area: "幼儿体能", points: 20 },
  reading: { title: "看书 20 分钟", standard: "计时阅读 20 分钟，并记录 1 句收获。", type: "growth", area: "个人成长", points: 20 },
  basketball: { title: "篮球 30 分钟", standard: "完成 30 分钟篮球训练或投篮练习。", type: "growth", area: "身体训练", points: 20 },
  assertive: { title: "微争取 1 次", standard: "主动提出一个小请求、表达一个不同意见，或争取一次小机会。", type: "growth", area: "主动争取", points: 15 },
  baseline: { title: "保底：写 50 字", standard: "状态差也要写 50 字，保持行动不断线。", type: "baseline", area: "个人成长", points: 5 }
};

let state = loadState();

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      tasks: [],
      rewards: defaultRewards,
      logs: [],
      accounts: { instant: 0, saving: 0 },
      settings: { instantSplit: 70 }
    };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      tasks: parsed.tasks || [],
      rewards: parsed.rewards?.length ? parsed.rewards : defaultRewards,
      logs: parsed.logs || [],
      accounts: parsed.accounts || { instant: 0, saving: 0 },
      settings: { instantSplit: parsed.settings?.instantSplit ?? 70 }
    };
  } catch {
    return {
      tasks: [], rewards: defaultRewards, logs: [], accounts: { instant: 0, saving: 0 }, settings: { instantSplit: 70 }
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1800);
}

function addLog(kind, amount, text, meta = {}) {
  state.logs.unshift({ id: uid("log"), kind, amount, text, meta, createdAt: nowIso() });
  state.logs = state.logs.slice(0, 300);
}

function accountName(account) {
  return account === "saving" ? "长期积分" : "即时积分";
}

function typeName(type) {
  const map = { core: "核心任务", growth: "成长任务", baseline: "保底任务" };
  return map[type] || type;
}

function render() {
  renderHeader();
  renderTasks();
  renderRewards();
  renderLogs();
  renderSettings();
}

function renderHeader() {
  $("#todayLabel").textContent = `${todayKey()} · 今日`;
  $("#instantPoints").textContent = state.accounts.instant;
  $("#savingPoints").textContent = state.accounts.saving;
  const earned = state.logs
    .filter(log => log.kind === "earn" && toDateKey(log.createdAt) === todayKey())
    .reduce((sum, log) => sum + log.amount, 0);
  const doneCount = state.tasks.filter(task => task.completedAt && toDateKey(task.completedAt) === todayKey()).length;
  $("#todayEarned").textContent = earned;
  $("#todayDoneText").textContent = `完成 ${doneCount} 个任务`;
  $("#streakDays").textContent = calculateStreak();
}

function calculateStreak() {
  const doneDays = new Set(state.tasks.filter(t => t.completedAt).map(t => toDateKey(t.completedAt)));
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = cursor.toLocaleDateString("sv-SE");
    if (doneDays.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function todaysTasks() {
  const today = todayKey();
  return state.tasks.filter(task => task.createdDate === today || (task.completedAt && toDateKey(task.completedAt) === today));
}

function renderTasks() {
  const list = $("#taskList");
  const tasks = todaysTasks().sort((a, b) => Number(Boolean(a.completedAt)) - Number(Boolean(b.completedAt)) || b.createdAt.localeCompare(a.createdAt));
  if (!tasks.length) {
    list.innerHTML = `<div class="empty-state">今天还没有任务。可以先点上方模板，添加一个“保底任务”。</div>`;
    return;
  }
  list.innerHTML = tasks.map(task => `
    <article class="item-card ${task.completedAt ? "done" : ""}">
      <div class="item-top">
        <div>
          <p class="item-title">${escapeHtml(task.title)}</p>
          <p class="item-meta">${escapeHtml(task.standard || "没有填写完成标准")}</p>
        </div>
        <span class="badge points">+${task.points}</span>
      </div>
      <div class="badges">
        <span class="badge">${typeName(task.type)}</span>
        <span class="badge">${escapeHtml(task.area)}</span>
        ${task.completedAt ? `<span class="badge">已完成：${formatDateTime(task.completedAt)}</span>` : ""}
      </div>
      <div class="card-actions">
        ${task.completedAt ? "" : `<button class="primary-button" data-complete-task="${task.id}" type="button">完成</button>`}
        <button class="ghost-button" data-delete-task="${task.id}" type="button">删除</button>
      </div>
    </article>
  `).join("");
}

function renderRewards() {
  const list = $("#rewardList");
  if (!state.rewards.length) {
    list.innerHTML = `<div class="empty-state">还没有奖励。先添加一个小奖励，例如“刷短视频 20 分钟”。</div>`;
    return;
  }
  list.innerHTML = state.rewards.map(reward => `
    <article class="item-card">
      <div class="item-top">
        <div>
          <p class="item-title">${escapeHtml(reward.title)}</p>
          <p class="item-meta">${escapeHtml(reward.limit || "没有限制说明")}</p>
        </div>
        <span class="badge points">-${reward.cost}</span>
      </div>
      <div class="badges">
        <span class="badge">${accountName(reward.account)}</span>
      </div>
      <div class="card-actions">
        <button class="primary-button" data-redeem-reward="${reward.id}" type="button">兑换</button>
        <button class="ghost-button" data-delete-reward="${reward.id}" type="button">删除</button>
      </div>
    </article>
  `).join("");
}

function renderLogs() {
  const list = $("#logList");
  if (!state.logs.length) {
    list.innerHTML = `<div class="empty-state">还没有积分记录。</div>`;
    return;
  }
  list.innerHTML = state.logs.slice(0, 30).map(log => `
    <div class="log-item">
      <strong>${log.kind === "earn" ? "+" : "-"}${log.amount}</strong>
      · ${escapeHtml(log.text)}<br />
      ${formatDateTime(log.createdAt)}
    </div>
  `).join("");
}

function renderSettings() {
  $("#splitRange").value = state.settings.instantSplit;
  $("#splitLabel").textContent = `${state.settings.instantSplit}%`;
}

function addTask(input) {
  const task = {
    id: uid("task"),
    title: input.title.trim(),
    standard: input.standard?.trim() || "",
    type: input.type || "growth",
    area: input.area || "个人成长",
    points: Number(input.points) || 10,
    createdAt: nowIso(),
    createdDate: todayKey(),
    completedAt: null
  };
  state.tasks.unshift(task);
  saveState();
  render();
  toast("任务已添加");
}

function completeTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task || task.completedAt) return;
  task.completedAt = nowIso();
  const instant = Math.floor(task.points * state.settings.instantSplit / 100);
  const saving = task.points - instant;
  state.accounts.instant += instant;
  state.accounts.saving += saving;
  addLog("earn", task.points, `完成任务：${task.title}`, { taskId: task.id, instant, saving });
  saveState();
  render();
  toast(`完成任务，获得 ${task.points} 分`);
}

function deleteTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  if (task.completedAt) {
    const ok = confirm("这个任务已经完成。删除不会自动扣回积分。确定删除吗？");
    if (!ok) return;
  }
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  render();
  toast("任务已删除");
}

function addReward(input) {
  const reward = {
    id: uid("reward"),
    title: input.title.trim(),
    cost: Number(input.cost) || 10,
    account: input.account || "instant",
    limit: input.limit?.trim() || ""
  };
  state.rewards.unshift(reward);
  saveState();
  render();
  toast("奖励已添加");
}

function redeemReward(id) {
  const reward = state.rewards.find(r => r.id === id);
  if (!reward) return;
  const account = reward.account || "instant";
  if (state.accounts[account] < reward.cost) {
    toast(`${accountName(account)}不足`);
    return;
  }
  const ok = confirm(`确定兑换“${reward.title}”？将消耗 ${reward.cost} 分。`);
  if (!ok) return;
  state.accounts[account] -= reward.cost;
  addLog("spend", reward.cost, `兑换奖励：${reward.title}`, { rewardId: reward.id, account });
  saveState();
  render();
  toast("奖励已兑换");
}

function deleteReward(id) {
  const ok = confirm("确定删除这个奖励吗？");
  if (!ok) return;
  state.rewards = state.rewards.filter(r => r.id !== id);
  saveState();
  render();
  toast("奖励已删除");
}

function generateMarkdown() {
  const today = todayKey();
  const completed = state.tasks.filter(task => task.completedAt && toDateKey(task.completedAt) === today);
  const earnedLogs = state.logs.filter(log => log.kind === "earn" && toDateKey(log.createdAt) === today);
  const spentLogs = state.logs.filter(log => log.kind === "spend" && toDateKey(log.createdAt) === today);
  const earned = earnedLogs.reduce((sum, log) => sum + log.amount, 0);
  const spent = spentLogs.reduce((sum, log) => sum + log.amount, 0);
  const reflection = $("#reflection").value.trim() || "今天还没有填写反思。";
  const tomorrow = $("#tomorrowPlan").value.trim() || "明天建议只设置 1-3 个核心任务，再保留 1 个保底任务。";

  const taskLines = completed.length
    ? completed.map(task => `- [x] ${task.title}｜${task.area}｜+${task.points} 分\n  - 完成标准：${task.standard || "未填写"}`).join("\n")
    : "- 今天还没有完成任务。";
  const rewardLines = spentLogs.length
    ? spentLogs.map(log => `- ${log.text.replace("兑换奖励：", "")}｜-${log.amount} 分`).join("\n")
    : "- 今天没有兑换奖励。";

  const md = `# 今日行动日报｜${today}\n\n## 一、今日完成任务\n\n${taskLines}\n\n## 二、今日积分\n\n- 今日获得：${earned} 分\n- 今日消耗：${spent} 分\n- 今日净增长：${earned - spent} 分\n- 当前即时积分：${state.accounts.instant} 分\n- 当前长期积分：${state.accounts.saving} 分\n\n## 三、今日兑换奖励\n\n${rewardLines}\n\n## 四、今日反思\n\n${reflection}\n\n## 五、明日建议\n\n${tomorrow}\n\n## 六、核心提醒\n\n> 我不需要一天完成很多事，但需要每天至少完成一点点重要的事。\n`;
  $("#markdownOutput").value = md;
  return md;
}

function downloadText(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[ch]));
}

function bindEvents() {
  $$(".tab").forEach(button => {
    button.addEventListener("click", () => {
      $$(".tab").forEach(b => b.classList.remove("active"));
      $$(".panel").forEach(panel => panel.classList.remove("active"));
      button.classList.add("active");
      $(`#${button.dataset.tab}`).classList.add("active");
    });
  });

  $("#addTaskBtn").addEventListener("click", () => $("#taskForm").classList.remove("hidden"));
  $("#cancelTaskBtn").addEventListener("click", () => $("#taskForm").classList.add("hidden"));
  $("#taskForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addTask({
      title: $("#taskTitle").value,
      standard: $("#taskStandard").value,
      type: $("#taskType").value,
      area: $("#taskArea").value,
      points: $("#taskPoints").value
    });
    event.target.reset();
    $("#taskPoints").value = 20;
    $("#taskForm").classList.add("hidden");
  });

  $$(".quick-templates button").forEach(button => {
    button.addEventListener("click", () => addTask(templates[button.dataset.template]));
  });

  $("#taskList").addEventListener("click", event => {
    const completeId = event.target.dataset.completeTask;
    const deleteId = event.target.dataset.deleteTask;
    if (completeId) completeTask(completeId);
    if (deleteId) deleteTask(deleteId);
  });

  $("#addRewardBtn").addEventListener("click", () => $("#rewardForm").classList.remove("hidden"));
  $("#cancelRewardBtn").addEventListener("click", () => $("#rewardForm").classList.add("hidden"));
  $("#rewardForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addReward({
      title: $("#rewardTitle").value,
      cost: $("#rewardCost").value,
      account: $("#rewardAccount").value,
      limit: $("#rewardLimit").value
    });
    event.target.reset();
    $("#rewardCost").value = 20;
    $("#rewardForm").classList.add("hidden");
  });

  $("#rewardList").addEventListener("click", event => {
    const redeemId = event.target.dataset.redeemReward;
    const deleteId = event.target.dataset.deleteReward;
    if (redeemId) redeemReward(redeemId);
    if (deleteId) deleteReward(deleteId);
  });

  $("#generateReviewBtn").addEventListener("click", () => { generateMarkdown(); toast("日报已生成"); });
  $("#copyMarkdownBtn").addEventListener("click", async () => {
    const md = $("#markdownOutput").value || generateMarkdown();
    try {
      await navigator.clipboard.writeText(md);
      toast("已复制 Markdown");
    } catch {
      $("#markdownOutput").select();
      document.execCommand("copy");
      toast("已复制 Markdown");
    }
  });
  $("#downloadMarkdownBtn").addEventListener("click", () => {
    const md = $("#markdownOutput").value || generateMarkdown();
    downloadText(`今日行动日报-${todayKey()}.md`, md, "text/markdown;charset=utf-8");
  });

  $("#splitRange").addEventListener("input", event => {
    state.settings.instantSplit = Number(event.target.value);
    saveState();
    renderSettings();
  });

  $("#exportDataBtn").addEventListener("click", () => {
    downloadText(`行动积分备份-${todayKey()}.json`, JSON.stringify(state, null, 2), "application/json;charset=utf-8");
  });
  $("#importDataInput").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.tasks || !parsed.rewards || !parsed.accounts) throw new Error("Invalid backup");
      state = parsed;
      saveState();
      render();
      toast("备份已导入");
    } catch {
      toast("导入失败：文件格式不对");
    } finally {
      event.target.value = "";
    }
  });
  $("#resetDataBtn").addEventListener("click", () => {
    const ok = confirm("确定清空全部数据吗？这个操作不能撤销。建议先导出备份。");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    state = loadState();
    render();
    toast("数据已清空");
  });

  $("#installHelpBtn").addEventListener("click", () => $("#installDialog").showModal());
  $("#closeInstallDialogBtn").addEventListener("click", () => $("#installDialog").close());
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("sw.js");
  } catch (error) {
    console.warn("Service worker registration failed", error);
  }
}

bindEvents();
render();
registerServiceWorker();
