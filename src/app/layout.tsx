import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = {
  title: "Luna RAG Lab · Research Terminal",
  description: "Synthetic RAG and analytics experimentation workbench",
};
const links = [
  ["/", "Overview"],
  ["/chat", "Workbench"],
  ["/knowledge", "Knowledge"],
  ["/knowledge/graph", "Knowledge graph"],
  ["/playground/chunking", "Chunking"],
  ["/experiments", "A/B experiments"],
  ["/datasets", "Datasets"],
  ["/safety", "Safety"],
  ["/evaluations", "Evaluations"],
  ["/runs", "Runs"],
  ["/architecture", "Architecture"],
  ["/docs", "Field notes"],
  ["/owner", "Owner access"],
];
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="shell">
          <aside className="sidebar">
            <Link href="/" className="brand">
              <span className="brandmark">L/</span>
              <span>
                LUNA<span className="brand-sub">RAG LAB / 02</span>
              </span>
            </Link>
            <div className="nav-caption">RESEARCH TERMINAL</div>
            <nav aria-label="Main navigation">
              {links.map(([href, label], i) => (
                <Link key={href} href={href}>
                  <span className="nav-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {label}
                </Link>
              ))}
            </nav>
            <div className="sidebar-footer">
              <span className="status-dot" /> Synthetic data only
              <br />
              <small>
                ENGINEERING OBSERVATORY
                <br />
                Knowledge → evidence → answer
              </small>
            </div>
          </aside>
          <div className="main-shell">
            <header className="topbar">
              <span>
                RETRIEVAL SYSTEMS{" "}
                <span className="muted">/ EXPERIMENTAL WORKBENCH</span>
              </span>
              <span className="tag">LAB v2.0</span>
            </header>
            {children}
            <footer className="footer">
              LUNA RAG LAB <span>Every answer has a path. Inspect it.</span>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
