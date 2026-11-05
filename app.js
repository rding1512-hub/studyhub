const SUPABASE_URL = "https://vmwomofhjatgnajtylnj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_B66rP6Jd0DqcVb6A2TBI9g_oVQYA2YE";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const authScreen = document.getElementById("authScreen");
const appScreen = document.getElementById("appScreen");
const authForm = document.getElementById("authForm");
const authMessage = document.getElementById("authMessage");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskSubject = document.getElementById("taskSubject");
const taskDueDate = document.getElementById("taskDueDate");
const taskList = document.getElementById("taskList");
const emptyMessage = document.getElementById("emptyMessage");

let currentUser = null;

function showMessage(text, isError = true) {
  authMessage.textContent = text;
  authMessage.style.color = isError ? "#b91c1c" : "#15803d";
}

function showApp(show) {
  authScreen.classList.toggle("hidden", show);
  appScreen.classList.toggle("hidden", !show);
}

async function loadTasks() {
  if (!currentUser) return;

  const { data, error } = await db
    .from("tasks")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("completed", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    alert("Could not load tasks: " + error.message);
    return;
  }

  renderTasks(data || []);
}

function formatDate(dateString) {
  if (!dateString) return "No due date";
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function renderTasks(tasks) {
  taskList.innerHTML = "";
  emptyMessage.classList.toggle("hidden", tasks.length > 0);

  for (const task of tasks) {
    const li = document.createElement("li");
    li.className = "task" + (task.completed ? " completed" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => toggleTask(task));

    const info = document.createElement("div");
    info.className = "task-info";

    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = task.title;

    const meta = document.createElement("div");
    meta.className = "task-meta";
    meta.textContent = [
      task.subject || "No subject",
      formatDate(task.due_date)
    ].join(" • ");

    info.append(title, meta);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteTask(task));

    li.append(checkbox, info, deleteButton);
    taskList.appendChild(li);
  }
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  const { error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage(error.message);
  }
});

document.getElementById("signupButton").addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || password.length < 6) {
    showMessage("Enter an email and a password of at least 6 characters.");
    return;
  }

  const { data, error } = await db.auth.signUp({
    email,
    password
  });

  if (error) {
    showMessage(error.message);
    return;
  }

  if (data.session) {
    showMessage("Account created.", false);
  } else {
    showMessage("Check your email to confirm your account, then log in.", false);
  }
});

taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const { error } = await db
    .from("tasks")
    .insert({
      user_id: currentUser.id,
      title: taskTitle.value.trim(),
      subject: taskSubject.value.trim(),
      due_date: taskDueDate.value || null
    })
    .select();

  if (error) {
    alert("Could not add task: " + error.message);
    return;
  }

  taskTitle.value = "";
  taskSubject.value = "";
  taskDueDate.value = "";

  await loadTasks();
});

async function toggleTask(task) {
  const { error } = await db
    .from("tasks")
    .update({ completed: !task.completed })
    .eq("id", task.id);

  if (error) {
    alert("Could not update task: " + error.message);
  }

  await loadTasks();
}

async function deleteTask(task) {
  const { error } = await db
    .from("tasks")
    .delete()
    .eq("id", task.id);

  if (error) {
    alert("Could not delete task: " + error.message);
  }

  await loadTasks();
}

document.getElementById("refreshButton").addEventListener("click", loadTasks);

document.getElementById("logoutButton").addEventListener("click", async () => {
  await db.auth.signOut();
  currentUser = null;
  showApp(false);
});

db.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    currentUser = session.user;
    showApp(true);
    loadTasks();
  } else {
    currentUser = null;
    showApp(false);
  }
});

(async () => {
  const { data } = await db.auth.getSession();

  if (data.session?.user) {
    currentUser = data.session.user;
    showApp(true);
    await loadTasks();
  } else {
    showApp(false);
  }
})();
