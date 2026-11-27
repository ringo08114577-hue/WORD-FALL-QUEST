import { createAppSession } from "./app-session.js";
import { JOBS } from "./jobs.js";

const session = createAppSession();
const options = document.getElementById("jobOptions");
const confirmButton = document.getElementById("confirmJob");
const status = document.getElementById("jobStatus");

if (session.getSelectedJobId()) {
  window.location.replace("./index.html");
} else {
  let selectedJobId = null;

  for (const job of JOBS) {
    const card = document.createElement("article");
    card.className = "job-card";
    const icon = document.createElement("div");
    icon.className = "job-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = job.icon;

    const copy = document.createElement("div");
    copy.className = "job-copy";
    const name = document.createElement("h2");
    name.textContent = job.name;
    const title = document.createElement("div");
    title.className = "job-title";
    title.textContent = job.title;
    const description = document.createElement("p");
    description.className = "job-description";
    description.textContent = job.description;
    const strength = document.createElement("p");
    strength.className = "job-strength";
    strength.textContent = "得意：" + job.strength;
    copy.append(name, title, description, strength);

    const badge = document.createElement("span");
    badge.className = "job-badge";
    badge.textContent = job.note;

    const choose = document.createElement("button");
    choose.type = "button";
    choose.className = "confirm";
    choose.textContent = "この職業を選ぶ";
    choose.addEventListener("click", () => {
      selectedJobId = job.id;
      for (const button of options.querySelectorAll("button")) {
        button.textContent = button === choose ? "選択中 ✓" : "この職業を選ぶ";
        button.setAttribute("aria-pressed", String(button === choose));
      }
      confirmButton.disabled = false;
      confirmButton.textContent = job.name + "で冒険を始める";
      status.textContent = job.name + "を選択中。下のボタンで確定しよう。";
    });

    card.append(icon, copy, badge);
    options.append(card, choose);
  }

  confirmButton.addEventListener("click", () => {
    if (!selectedJobId) return;
    confirmButton.disabled = true;
    const result = session.selectJob(selectedJobId);
    if (!result.selected || !result.saved) {
      confirmButton.disabled = false;
      status.textContent = "職業を保存できませんでした。もう一度押してね。";
      return;
    }
    status.textContent = result.job.name + "に決定！冒険者ギルドへ向かおう。";
    window.location.replace("./index.html");
  });
}
