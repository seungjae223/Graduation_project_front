import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '../../../src/App.css';
import '../../../src/index.css';
import Search from '../../../src/Search/Search';
import PopularAll from '../../../src/Homepage/PopularAll';
import Recommend from '../../../src/Recommend/Recommend';
import Detail from '../../../src/Recommend/Detail';
import Home from '../../../src/Homepage/Home';
import { DetailSection, buildDaysFromServerData } from '../../../src/RouteResult/RouteResult';
import { SavedPlacesProvider } from '../../../src/Context/SavedPlacesContext';
import StartPlaceModal from '../../../src/RouteCreate/StartPlaceModal';
import PlacePhoto from '../../../src/components/PlacePhoto';
import manifest from '../../../src/data/placeImages.json';
import { applyTheme } from '../../../src/utils/theme';
import { places } from './fixture-api';
import '../../../src/responsive.css';
import '../../../src/modal.css';
const q = new URLSearchParams(window.location.search), screen = q.get('screen') || 'search';
applyTheme(q.get('theme') || 'light');
const screens = {rinku:'/search?keyword=린쿠',rinkuDetail:'/detail?id=16',search:'/search?region=오사카', more:'/popular-all', country:'/popular-all', region:'/search?region=서울', detail:'/detail?id=1', recommend:'/recommend?theme=photo', home:'/'};
const tripPlaces = [places[0], places[2], places[15]].map((p,i)=>({...p,id:90000+i,placeId:p.id,placeName:p.name,day:1,visitOrder:i+1,arrivalTime:`${9+i}:00:00`}));
const tripDay = buildDaysFromServerData({id:7,title:'사진 검증',startDate:'2026-10-14',endDate:'2026-10-14'},tripPlaces)[0];
function Preview() {
  return <><nav style={{display:'flex',gap:8,padding:12,flexWrap:'wrap'}}>{['rinku','rinkuDetail','search','more','country','region','detail','trip','recommend','home','selection','all','failure'].map(s=><a key={s} href={`/?screen=${s}`} style={{fontSize:12}}>{s}</a>)}</nav>
    <Routes><Route path="/search" element={<Search/>}/><Route path="/popular-all" element={<PopularAll/>}/><Route path="/recommend" element={<Recommend/>}/><Route path="/detail" element={<Detail/>}/><Route path="/" element={screen==='home'?<Home/>:<></>}/></Routes>
    {screen==='trip' && <main className="route-result-page"><DetailSection day={tripDay} dayIndex={0}/></main>}
    {screen==='selection' && <StartPlaceModal open selectedDates={[new Date(2026,9,14)]} getDateKey={()=>'preview'} placesByDate={{preview:places.slice(0,8)}} selectedStartPlaces={{}} onClose={()=>{}} onConfirm={()=>{}} onSelectPlace={()=>{}} onChangeDay={()=>{}}/>}
    {screen==='all' && <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,padding:16}}>{manifest.map(p=><article key={p.identityKey} style={{minWidth:0}}><div style={{position:'relative',width:'100%',aspectRatio:'4/3'}}><PlacePhoto place={{...p,name:p.placeName}} loading="eager" alt={p.placeName} className="audit-photo"/></div><p style={{fontSize:12}}>{p.region} · {p.placeName}</p></article>)}</div>}
    {screen==='failure' && <main style={{padding:20}}><div style={{position:'relative',width:240,height:180}}><PlacePhoto src="/missing-photo.jpg" alt="이미지 오류" className="audit-photo"/></div><div style={{width:240,height:180}}><PlacePhoto place={{...places[0],countryCode:'US'}} alt="동명 다른 국가" className="audit-photo"/></div></main>}
    <style>{'.audit-photo{display:block;width:100%;height:100%;object-fit:cover}'}</style>
  </>;
}
createRoot(document.getElementById('root')).render(<MemoryRouter initialEntries={[screens[screen] || '/']}><SavedPlacesProvider><Preview/></SavedPlacesProvider></MemoryRouter>);
