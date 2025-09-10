// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Attendance from "./pages/Attendance";
import Manager from "./pages/Manager";
import Admin from "./pages/Admin";
import Tasks from "./pages/Tasks";
import AdminTasks from "./pages/AdminTasks";
import { useAuth } from "./auth/AuthContext";
import { JSX } from "react";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { session } = useAuth();
  return session ? children : <Navigate to="/" replace />;
}

function RequireRole({ role, children }: { role: "Manager" | "Admin" | "Employee"; children: JSX.Element }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/" replace />;
  return session.role === role ? children : <Navigate to="/attendance" replace />;
}


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/attendance" element={<RequireAuth><Attendance /></RequireAuth>} />
        <Route path="/manager" element={<RequireRole role="Manager"><Manager /></RequireRole>} />
        <Route path="/admin" element={<RequireRole role="Admin"><Admin /></RequireRole>} /> 
        <Route path="/tasks" element={<RequireAuth><Tasks /></RequireAuth>} />
        <Route path="/admin-tasks" element={<RequireRole role="Admin"><AdminTasks /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}




// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.tsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App
