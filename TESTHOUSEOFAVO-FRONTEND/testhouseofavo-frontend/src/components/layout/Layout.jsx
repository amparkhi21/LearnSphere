import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

const Layout = ({ children, noFooter }) => (
  <div className="min-h-screen flex flex-col bg-slate-50">
    <Navbar />
    <main className="flex-1">{children}</main>
    {!noFooter && <Footer />}
  </div>
);

export default Layout;
