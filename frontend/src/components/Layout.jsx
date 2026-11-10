import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import './Layout.css'; // Optional: We can add some styles

function Layout() {
  const location = useLocation();
  
  return (
    <div className="layout-container">
      <nav className="navbar">
        <div className="nav-brand">Progress Tracker</div>
        <div className="nav-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Roadmap</Link>
          <Link to="/pwp" className={location.pathname === '/pwp' ? 'active' : ''}>PWP</Link>
          <Link to="/daily" className={location.pathname === '/daily' ? 'active' : ''}>Daily Task</Link>
          <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>Dashboard</Link>
        </div>
      </nav>
      <div className="content">
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
