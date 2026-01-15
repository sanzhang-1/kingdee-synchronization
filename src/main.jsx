import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import OrgModuleSelect from './org/OrgModuleSelect';
import './index.css';

// 关键修复1：校验 root 节点是否存在（避免 createRoot 传入 null）
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('根节点 #root 不存在！请检查 public/index.html 是否有 id="root" 的元素');
  // 兜底创建节点（可选）
  const div = document.createElement('div');
  div.id = 'root';
  document.body.appendChild(div);
}

// 关键修复2：严格模式（帮助排查 Hooks 违规使用）
const root = ReactDOM.createRoot(rootElement || document.createElement('div'));
root.render(
  <React.StrictMode> {/* 严格模式会检测 Hooks 违规，控制台输出警告 */}
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/org-module-select" element={<OrgModuleSelect />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);