import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import '../../../src/App.css';
import '../../../src/index.css';
import Recommend from '../../../src/Recommend/Recommend';
import Total from '../../../src/Recommend/Total';
import Detail from '../../../src/Recommend/Detail';
import { SavedPlacesProvider } from '../../../src/Context/SavedPlacesContext';
import { applyTheme } from '../../../src/utils/theme';
import '../../../src/responsive.css';
import '../../../src/modal.css';
applyTheme(new URLSearchParams(window.location.search).get('mode') || 'light');
function Preview() {
  const navigate=useNavigate();
  return <><header style={{display:'flex',alignItems:'center',gap:12,padding:12,maxWidth:390,margin:'0 auto'}}><button type="button" onClick={()=>navigate(-1)}>뒤로가기</button><span>너만 오면 go · 로컬 검증</span></header>
    <Routes><Route path="/recommend" element={<Recommend/>}/><Route path="/total" element={<Total/>}/><Route path="/detail" element={<Detail/>}/></Routes></>;
}
createRoot(document.getElementById('root')).render(<BrowserRouter><SavedPlacesProvider><Preview/></SavedPlacesProvider></BrowserRouter>);
