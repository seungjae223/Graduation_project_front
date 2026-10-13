import { normalizeInquiry, readInquiryList } from "./inquiryData";
import { getRecentPlaces, saveRecentPlace } from "../utils/recentPlaces";
test("only supplied answer fields are normalized, including list/detail aliases", () => {
  const row=normalizeInquiry({id:1,status:'answered',answerText:'실제 답변'});
  expect(row.answerData).toEqual({body:'실제 답변',team:'',date:'',intro:'',progressTitle:'',progressText:'',outro:'',end:''});
  expect(normalizeInquiry({id:2,status:'waiting'}).answerData).toBeNull();
  expect(normalizeInquiry({id:3,status:'answered'}).statusText).toBe('답변 내용 확인 필요');
  expect(readInquiryList({content:[{id:1,answer:'실제'}]})).toHaveLength(1);
  expect(()=>readInquiryList({unexpected:[]})).toThrow();
});
test.each(['{}','"valid string"','null','bad json'])('invalid recent record container %s is isolated', raw => {
  localStorage.setItem('recentPlaces',raw);localStorage.setItem('unrelated','keep');
  expect(getRecentPlaces()).toEqual([]); expect(localStorage.getItem('unrelated')).toBe('keep');
});
test('invalid array records are removed while valid records and unrelated storage are preserved',()=>{
  localStorage.setItem('recentPlaces',JSON.stringify([null,{},'x',{id:1,name:'유효 기록'},{id:2,name:'잘못된 날짜',viewedAt:'invalid'}]));
  expect(getRecentPlaces()).toEqual([{id:1,name:'유효 기록'}]);
  saveRecentPlace({id:3,name:'새 기록'}); expect(getRecentPlaces().map(row=>row.id)).toEqual([3,1]);
});
