
import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap, Users, Search, Plus, Pencil, Trash2, LogOut,
  LayoutDashboard, ShieldCheck, BookOpen, Filter, X, RefreshCw,
  UserRound, Mail, Phone, Building2, CalendarDays, Award, LockKeyhole,
  ArrowLeft, ChevronRight
} from "lucide-react";

const API = "http://localhost:5000/api";

const emptyStudent = {
  studentId: "",
  name: "",
  email: "",
  department: "CSE",
  year: "1",
  cgpa: "",
  phone: ""
};

const departments = [
  "CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AI&DS", "Other"
];

async function api(path, { token, ...options } = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export default function App() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("smp_token") || ""
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("smp_user") || "null");
    } catch {
      return null;
    }
  });

  const [activePage, setActivePage] = useState("dashboard");
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    studentId: ""
  });

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyStudent);
  const [busy, setBusy] = useState(false);

  function notify(text, type = "success") {
    setMessage(text);
    setMessageType(type);
  }

  function storeSession(result) {
    sessionStorage.setItem("smp_token", result.token);
    sessionStorage.setItem("smp_user", JSON.stringify(result.user));

    setToken(result.token);
    setUser(result.user);
    setActivePage("dashboard");
    setMessage("");
  }

  function logout() {
    sessionStorage.removeItem("smp_token");
    sessionStorage.removeItem("smp_user");

    setToken("");
    setUser(null);
    setStudents([]);
    setShowForm(false);
    setActivePage("dashboard");
    setMessage("");
    setSearch("");
    setDepartment("All");
  }

  async function loadStudents() {
    if (!token) return;

    setLoading(true);

    try {
      const data = await api("/students", { token });
      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      if (/token|log in|authentication|unauthorized/i.test(error.message)) {
        logout();
      } else {
        notify(error.message, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token && user) {
      loadStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const path =
        authMode === "login" ? "/auth/login" : "/auth/register";

      const payload =
        authMode === "login"
          ? {
              email: authForm.email,
              password: authForm.password
            }
          : authForm;

      const result = await api(path, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      storeSession(result);
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  function openAdd() {
    setForm({ ...emptyStudent });
    setEditingId(null);
    setShowForm(true);
    setMessage("");
  }

  function openEdit(student) {
    setForm({
      studentId: student.studentId || "",
      name: student.name || "",
      email: student.email || "",
      department: student.department || "CSE",
      year: String(student.year || 1),
      cgpa: String(student.cgpa ?? ""),
      phone: student.phone || ""
    });

    setEditingId(student._id);
    setShowForm(true);
    setMessage("");
  }

  async function saveStudent(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const path = editingId
        ? `/students/${editingId}`
        : "/students";

      const result = await api(path, {
        token,
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          year: Number(form.year),
          cgpa: Number(form.cgpa)
        })
      });

      setShowForm(false);
      notify(result.message || "Student saved successfully.");
      await loadStudents();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteStudent(student) {
    const confirmed = window.confirm(
      `Delete ${student.name} (${student.studentId})? This also removes their login account.`
    );

    if (!confirmed) return;

    try {
      const result = await api(`/students/${student._id}`, {
        token,
        method: "DELETE"
      });

      notify(result.message || "Student deleted successfully.");
      await loadStudents();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  const visibleStudents = useMemo(() => {
    return students.filter(student => {
      const term = search.toLowerCase().trim();

      const matchesSearch =
        !term ||
        [student.name, student.studentId, student.email].some(value =>
          String(value || "").toLowerCase().includes(term)
        );

      const matchesDepartment =
        department === "All" || student.department === department;

      return matchesSearch && matchesDepartment;
    });
  }, [students, search, department]);

  const averageCgpa = students.length
    ? (
        students.reduce(
          (sum, student) => sum + Number(student.cgpa || 0),
          0
        ) / students.length
      ).toFixed(2)
    : "0.00";

  const finalYear = students.filter(
    student => Number(student.year) === 4
  ).length;

  const departmentCount = new Set(
    students.map(student => student.department).filter(Boolean)
  ).size;

  const studentProfile = user?.role === "student" ? students[0] : null;

  if (!token || !user) {
    return (
      <div className="auth-page">
        <div className="auth-decoration decoration-one" />
        <div className="auth-decoration decoration-two" />

        <div className="auth-shell">
          <section className="auth-intro">
            <div className="brand brand-light">
              <span className="brand-icon">
                <GraduationCap size={24} />
              </span>
              <span>
                Campus<span className="brand-accent">Desk</span>
              </span>
            </div>

            <div className="intro-copy">
              <span className="eyebrow light-eyebrow">
                STUDENT MANAGEMENT PLATFORM
              </span>
              <h1>One place to manage the whole student journey.</h1>
              <p>
                Organize student records, keep profiles accessible,
                and make everyday academic administration simpler.
              </p>
            </div>

            <div className="intro-features">
              <div><ShieldCheck size={18} /><span>Role-based access</span></div>
              <div><Users size={18} /><span>Centralized student records</span></div>
              <div><BookOpen size={18} /><span>Built for campus workflows</span></div>
            </div>

            <div className="intro-footer">
              A clean workspace for better campus administration.
            </div>
          </section>

          <section className="auth-card-wrap">
            <div className="auth-card">
              <div className="mobile-brand brand">
                <span className="brand-icon">
                  <GraduationCap size={22} />
                </span>
                <span>
                  Campus<span className="brand-accent">Desk</span>
                </span>
              </div>

              <div className="auth-heading">
                <span className="eyebrow">WELCOME TO CAMPUSDESK</span>
                <h2>
                  {authMode === "login"
                    ? "Sign in to your account"
                    : "Create your student account"}
                </h2>
                <p>
                  {authMode === "login"
                    ? "Enter your details to continue to your workspace."
                    : "Use the details that match your student record."}
                </p>
              </div>

              <form className="auth-form" onSubmit={submitAuth}>
                {authMode === "register" && (
                  <>
                    <label>
                      Full name
                      <input
                        required
                        minLength="2"
                        value={authForm.name}
                        onChange={e =>
                          setAuthForm({ ...authForm, name: e.target.value })
                        }
                        placeholder="Enter your full name"
                      />
                    </label>

                    <label>
                      Student ID
                      <input
                        required
                        value={authForm.studentId}
                        onChange={e =>
                          setAuthForm({
                            ...authForm,
                            studentId: e.target.value
                          })
                        }
                        placeholder="e.g. VVIT2027"
                      />
                    </label>
                  </>
                )}

                <label>
                  Email address
                  <div className="input-icon">
                    <Mail size={17} />
                    <input
                      required
                      type="email"
                      value={authForm.email}
                      onChange={e =>
                        setAuthForm({ ...authForm, email: e.target.value })
                      }
                      placeholder="you@college.edu"
                    />
                  </div>
                </label>

                <label>
                  Password
                  <div className="input-icon">
                    <LockKeyhole size={17} />
                    <input
                      required
                      minLength={authMode === "register" ? 8 : undefined}
                      type="password"
                      value={authForm.password}
                      onChange={e =>
                        setAuthForm({
                          ...authForm,
                          password: e.target.value
                        })
                      }
                      placeholder={
                        authMode === "register"
                          ? "At least 8 characters"
                          : "Enter your password"
                      }
                    />
                  </div>
                </label>

                {message && (
                  <div className={`notice ${messageType}`}>{message}</div>
                )}

                <button className="primary-button full-button" disabled={busy}>
                  {busy
                    ? "Please wait..."
                    : authMode === "login"
                      ? "Sign in"
                      : "Create account"}
                  <span>→</span>
                </button>
              </form>

              <div className="auth-switch">
                {authMode === "login"
                  ? "New student?"
                  : "Already have an account?"}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "register" : "login");
                    setMessage("");
                  }}
                >
                  {authMode === "login" ? "Create an account" : "Sign in"}
                </button>
              </div>

              {authMode === "register" && (
                <p className="auth-help">
                  Registration works only after an administrator has added
                  your student record.
                </p>
              )}

              <div className="auth-card-bottom">
                <span>SECURE ACCESS</span>
                <span>STUDENT • ADMIN</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const page =
    !isAdmin && activePage === "students" ? "profile" : activePage;

  function navigateTo(nextPage) {
    setActivePage(nextPage);
    setMessage("");
    setShowForm(false);
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand sidebar-brand">
          <span className="brand-icon">
            <GraduationCap size={23} />
          </span>
          <span>
            Campus<span className="brand-accent">Desk</span>
          </span>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <button
          type="button"
          className={`nav-item ${page === "dashboard" ? "active" : ""}`}
          onClick={() => navigateTo("dashboard")}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          className={`nav-item ${
            page === (isAdmin ? "students" : "profile") ? "active" : ""
          }`}
          onClick={() => navigateTo(isAdmin ? "students" : "profile")}
        >
          <Users size={18} />
          <span>{isAdmin ? "Students" : "My profile"}</span>
          {isAdmin && <span className="nav-count">{students.length}</span>}
        </button>

        <div className="sidebar-bottom">
          <div className="security-card">
            <ShieldCheck size={18} />
            <div>
              <strong>Account secured</strong>
              <span>Signed in as {user.role}</span>
            </div>
          </div>

          <button type="button" className="logout-button" onClick={logout}>
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <strong>
              {page === "dashboard"
                ? "Dashboard"
                : page === "students"
                  ? "Students"
                  : "My profile"}
            </strong>
          </div>

          <div className="top-user">
            <div className="avatar">
              {user.name?.slice(0, 1).toUpperCase() || "U"}
            </div>
            <div className="top-user-info">
              <strong>{user.name}</strong>
              <span>{isAdmin ? "Administrator" : "Student account"}</span>
            </div>
          </div>
        </header>

        <div className="page-content">
          <div className="welcome-row">
            <div>
              <span className="eyebrow">
                {page === "dashboard"
                  ? "OVERVIEW"
                  : page === "students"
                    ? "DIRECTORY"
                    : "YOUR ACCOUNT"}
              </span>
              <h1>
                {page === "dashboard"
                  ? isAdmin
                    ? "Student dashboard"
                    : "Welcome back"
                  : page === "students"
                    ? "Manage students"
                    : "My student profile"}
              </h1>
              <p>
                {page === "dashboard"
                  ? isAdmin
                    ? "Manage student records and keep your campus data organized."
                    : "Here is your student profile and academic information."
                  : page === "students"
                    ? "Search, filter, add, and maintain student records."
                    : "View the details linked to your student account."}
              </p>
            </div>

            <div className="welcome-actions">
              {page !== "dashboard" && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigateTo("dashboard")}
                >
                  <ArrowLeft size={16} />
                  Dashboard
                </button>
              )}

              <button
                type="button"
                className="secondary-button"
                onClick={loadStudents}
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? "spin" : ""} />
                Refresh
              </button>

              {isAdmin && page === "students" && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={openAdd}
                >
                  <Plus size={17} />
                  Add student
                </button>
              )}
            </div>
          </div>

          {message && (
            <div className={`notice page-notice ${messageType}`}>
              <span>{message}</span>
              <button
                type="button"
                onClick={() => setMessage("")}
                aria-label="Dismiss message"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {isAdmin && page === "dashboard" && (
            <div className="stats-grid">
              <StatCard
                icon={<Users size={20} />}
                label="Total students"
                value={students.length}
                detail="Student records in the portal"
                tone="blue"
              />
              <StatCard
                icon={<Award size={20} />}
                label="Average CGPA"
                value={averageCgpa}
                detail="Across current student records"
                tone="purple"
              />
              <StatCard
                icon={<GraduationCap size={20} />}
                label="Final-year students"
                value={finalYear}
                detail="Students currently in year 4"
                tone="green"
              />
              <StatCard
                icon={<Building2 size={20} />}
                label="Departments"
                value={departmentCount}
                detail="Departments represented"
                tone="orange"
              />
            </div>
          )}

          {isAdmin && page === "dashboard" && (
            <section className="panel dashboard-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">GET STARTED</span>
                  <h2>Student management</h2>
                  <p>Keep student information organized in one place.</p>
                </div>
              </div>

              <div className="dashboard-shortcut">
                <div className="shortcut-icon">
                  <Users size={23} />
                </div>
                <div className="shortcut-copy">
                  <strong>Student directory</strong>
                  <span>
                    View student records, search by name or ID, and update
                    student details.
                  </span>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => navigateTo("students")}
                >
                  View students <ChevronRight size={16} />
                </button>
              </div>
            </section>
          )}

          {isAdmin && page === "students" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">RECORDS</span>
                  <h2>Student directory</h2>
                  <p>Search, filter, and maintain student information.</p>
                </div>
                <span className="record-count">
                  {visibleStudents.length}{" "}
                  {visibleStudents.length === 1 ? "record" : "records"}
                </span>
              </div>

              <div className="toolbar">
                <label className="search-field">
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search name, student ID, or email..."
                    aria-label="Search students"
                  />
                  {search && (
                    <button
                      type="button"
                      className="clear-search"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                    >
                      <X size={15} />
                    </button>
                  )}
                </label>

                <label className="filter-field">
                  <Filter size={16} />
                  <select
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    aria-label="Filter by department"
                  >
                    <option value="All">All departments</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
              </div>

              <StudentTable
                students={visibleStudents}
                onEdit={openEdit}
                onDelete={deleteStudent}
                loading={loading}
              />
            </section>
          )}

          {!isAdmin && (
            <section className="panel profile-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">ACADEMIC INFORMATION</span>
                  <h2>{page === "dashboard" ? "Your academic profile" : "My profile"}</h2>
                  <p>Your student information linked to this account.</p>
                </div>
              </div>

              {studentProfile ? (
                <>
                  <div className="student-profile-banner">
                    <div className="profile-large-avatar">
                      {studentProfile.name?.slice(0, 1).toUpperCase() || "S"}
                    </div>
                    <div>
                      <h3>{studentProfile.name}</h3>
                      <p>{studentProfile.studentId} · {studentProfile.department}</p>
                    </div>
                    <span className="role-pill">Student</span>
                  </div>

                  <div className="profile-grid">
                    <ProfileCard icon={<UserRound />} label="Student ID" value={studentProfile.studentId} />
                    <ProfileCard icon={<Mail />} label="Email address" value={studentProfile.email} />
                    <ProfileCard icon={<Building2 />} label="Department" value={studentProfile.department} />
                    <ProfileCard icon={<CalendarDays />} label="Academic year" value={`Year ${studentProfile.year}`} />
                    <ProfileCard icon={<Award />} label="CGPA" value={`${Number(studentProfile.cgpa || 0).toFixed(2)} / 10`} />
                    <ProfileCard icon={<Phone />} label="Phone" value={studentProfile.phone || "Not provided"} />
                  </div>
                </>
              ) : (
                <EmptyState
                  loading={loading}
                  title="Profile not found"
                  text="Contact your administrator to link your student record."
                />
              )}
            </section>
          )}

          <footer className="footer">
            <span>
              © {new Date().getFullYear()} CampusDesk Student Management Portal
            </span>
            <span><ShieldCheck size={14} /> Secure role-based workspace</span>
          </footer>
        </div>
      </main>

      {showForm && isAdmin && (
        <div
          className="modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-modal-title"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  {editingId ? "UPDATE RECORD" : "NEW RECORD"}
                </span>
                <h2 id="student-modal-title">
                  {editingId ? "Edit student" : "Add student"}
                </h2>
                <p>Fill in the student's details below.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveStudent}>
              <div className="form-grid">
                <label>
                  Student ID
                  <input
                    required
                    minLength="2"
                    value={form.studentId}
                    onChange={e => setForm({ ...form, studentId: e.target.value })}
                    placeholder="e.g. VVIT2027"
                  />
                </label>

                <label>
                  Full name
                  <input
                    required
                    minLength="2"
                    maxLength="80"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Student full name"
                  />
                </label>

                <label>
                  Email address
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="student@college.edu"
                  />
                </label>

                <label>
                  Phone number
                  <input
                    maxLength="20"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="Optional"
                  />
                </label>

                <label>
                  Department
                  <select
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                  >
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Academic year
                  <select
                    value={form.year}
                    onChange={e => setForm({ ...form, year: e.target.value })}
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </label>

                <label>
                  CGPA (0–10)
                  <input
                    required
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    value={form.cgpa}
                    onChange={e => setForm({ ...form, cgpa: e.target.value })}
                    placeholder="e.g. 8.75"
                  />
                </label>
              </div>

              {message && (
                <div className={`notice ${messageType}`}>{message}</div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={busy}>
                  {busy
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Add student"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, detail, tone }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </article>
  );
}

function ProfileCard({ icon, label, value }) {
  return (
    <article className="profile-card">
      <div className="profile-icon">{icon}</div>
      <div className="profile-card-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function EmptyState({ loading, title, text }) {
  return (
    <div className="empty-state">
      {loading ? <RefreshCw size={26} className="spin" /> : <Users size={30} />}
      <h3>{loading ? "Loading..." : title}</h3>
      <p>{text}</p>
    </div>
  );
}

function StudentTable({ students, onEdit, onDelete, loading }) {
  if (loading && !students.length) {
    return (
      <EmptyState
        loading
        title="Loading records"
        text="Please wait while student records are fetched."
      />
    );
  }

  if (!students.length) {
    return (
      <EmptyState
        loading={false}
        title="No student records found"
        text="Add a student or adjust your search and department filters."
      />
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>STUDENT</th>
            <th>STUDENT ID</th>
            <th>DEPARTMENT</th>
            <th>YEAR</th>
            <th>CGPA</th>
            <th>CONTACT</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student._id}>
              <td>
                <div className="table-student">
                  <div className="mini-avatar">
                    {student.name?.slice(0, 1).toUpperCase() || "S"}
                  </div>
                  <div className="table-student-copy">
                    <strong>{student.name}</strong>
                    <span>{student.email}</span>
                  </div>
                </div>
              </td>
              <td><span className="student-id">{student.studentId}</span></td>
              <td><span className="department-pill">{student.department}</span></td>
              <td>Year {student.year}</td>
              <td>
                <strong className="cgpa">
                  {Number(student.cgpa || 0).toFixed(2)}
                </strong>
              </td>
              <td>{student.phone || "—"}</td>
              <td>
                <div className="row-actions">
                  <button
                    type="button"
                    className="icon-button edit"
                    title="Edit student"
                    aria-label={`Edit ${student.name}`}
                    onClick={() => onEdit(student)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-button delete"
                    title="Delete student"
                    aria-label={`Delete ${student.name}`}
                    onClick={() => onDelete(student)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
