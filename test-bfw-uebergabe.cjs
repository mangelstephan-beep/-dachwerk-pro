const assert=require('node:assert/strict');
const importer=require('./spreadsheet-import.js');

const headings=['Pos','Menge','MEH','Kurztext','Langtext','EP','PA'];
const row=(index,values)=>({index,hidden:false,values:values.map((value,i)=>({address:String.fromCharCode(65+i)+index,value,issue:'',formula:''}))});
const header=row(1,headings),profile=importer.bfwProfile(header.values);
assert(profile,'BFW Header nicht erkannt');
assert.deepEqual(profile.mapping,{number:0,qty:1,unit:2,text:3,longText:4,targetEp:5});
assert.equal(profile.hasPa,true,'PA nur als unbekannte Spalte markieren');
const book={sourceFormat:'XLS BIFF8',sheets:[{
 name:'Tabelle1',hidden:false,merged:[],rows:[
  header,
  row(2,['0010',12.5,'m²','Dachabdichtung','Oberlage fachgerecht verlegen',27.6,'unbekannt']),
  row(3,['0020',5,'Stk','Randabschluss','Randabschluss verschrauben',0,'nicht zugeordnet'])
 ]}]};
const result=importer.report(book,0,1,profile.mapping);
assert.equal(result.findings.length,0);
assert.equal(result.rows.length,2);
assert.equal(result.rows[0].number,'0010');
assert.equal(result.rows[0].qty,12.5);
assert.equal(result.rows[0].unit,'m²');
assert.equal(result.rows[0].text,'Dachabdichtung\nOberlage fachgerecht verlegen');
assert.equal(result.rows[0].targetEp,27.6);
assert.equal(result.rows[0].useTargetPrice,true);
assert(!Object.hasOwn(result.rows[0],'longText'));
assert(!Object.hasOwn(result.rows[0],'pa'),'Ungeklärtes PA darf nicht übernommen werden');
const empty={sourceFormat:'XLS BIFF8',sheets:[{name:'Tabelle1',hidden:false,merged:[],rows:[header]}]};
assert.throws(()=>importer.report(empty,0,1,profile.mapping),/Keine Datenzeilen/);
const formulaRow=row(2,['0012',2,'m²','Bahn','', '=A2*B2','']);
formulaRow.values[5].issue='Formel benötigt Prüfung';
const formula={sourceFormat:'XLS BIFF8',sheets:[{name:'Tabelle1',hidden:false,merged:[],rows:[header,formulaRow]}]};
const reviewed=importer.report(formula,0,1,profile.mapping);
assert.equal(reviewed.rows.length,0);
assert.equal(reviewed.findings.length,1);
assert.match(reviewed.findings[0].reason,/Formel/);
assert.equal(reviewed.findings[0].candidate.useTargetPrice,undefined);
assert.equal(importer.bfwProfile(row(1,['Pos','Menge','MEH','Kurztext','irgendein Feld','EP','PA']).values),null);
console.log('BFW: Header, automatische Zuordnung, Kurz-/Langtext, EP, PA-Sperre, Leerformular, Formelsperre und führende Null bestanden.');
