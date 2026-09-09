#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <shlobj.h>
#include <commctrl.h>
#include <filesystem>
#include <fstream>
#include <regex>
#include <set>
#include <sstream>
#include <string>
#include <vector>
#include <algorithm>
#include <chrono>

#include "scssdk_telemetry.h"
#include "sii_decryptor.h"

namespace fs = std::filesystem;

static HMODULE g_module{};
static HWND g_window{};
static HANDLE g_thread{};
static volatile bool g_stop=false;
static fs::path g_save;
static std::string g_text;

struct Depot { std::string company, city; };
struct Offer { std::string cargo, truck, variant, trailerDef; int units=1, distance=100; };
static std::vector<Depot> g_depots;
static std::vector<Offer> g_offers;

enum { C_SRC_CITY=101,C_SRC_COMP=102,C_DST_CITY=103,C_DST_COMP=104,C_CARGO=105,C_UNITS=106,
       B_SCAN=201,B_CREATE=202,L_STATUS=301 };

static std::string read_file(const fs::path& p) {
  std::ifstream f(p,std::ios::binary); return {std::istreambuf_iterator<char>(f),{}};
}
static bool write_file(const fs::path& p,const std::string& s) {
  std::ofstream f(p,std::ios::binary|std::ios::trunc); f.write(s.data(),(std::streamsize)s.size()); return !!f;
}
static void status(const std::string& s) { SetWindowTextA(GetDlgItem(g_window,L_STATUS),s.c_str()); }
static std::string combo(int id) {
  HWND h=GetDlgItem(g_window,id); int i=(int)SendMessage(h,CB_GETCURSEL,0,0); if(i<0)return {};
  int n=(int)SendMessage(h,CB_GETLBTEXTLEN,i,0); std::string s(n+1,'\0'); SendMessageA(h,CB_GETLBTEXT,i,(LPARAM)s.data()); s.resize(n); return s;
}
static void fill_combo(int id,const std::set<std::string>& values) {
  HWND h=GetDlgItem(g_window,id); SendMessage(h,CB_RESETCONTENT,0,0);
  for(auto& v:values) SendMessageA(h,CB_ADDSTRING,0,(LPARAM)v.c_str());
  if(!values.empty()) SendMessage(h,CB_SETCURSEL,0,0);
}
static fs::path documents() {
  wchar_t p[MAX_PATH]{}; SHGetFolderPathW(nullptr,CSIDL_MYDOCUMENTS,nullptr,SHGFP_TYPE_CURRENT,p); return p;
}
static fs::path newest_save() {
  fs::path best; fs::file_time_type time{};
  for(auto rootName:{"profiles","steam_profiles"}) {
    fs::path root=documents()/"Euro Truck Simulator 2"/rootName;
    std::error_code ec; if(!fs::exists(root,ec))continue;
    for(auto it=fs::recursive_directory_iterator(root,fs::directory_options::skip_permission_denied,ec);it!=fs::recursive_directory_iterator();it.increment(ec)) {
      if(ec)continue; if(!it->is_regular_file(ec)||it->path().filename()!="game.sii")continue;
      auto t=it->last_write_time(ec); if(best.empty()||t>time){best=it->path();time=t;}
    }
  }
  return best;
}
static bool load_save() {
  g_save=newest_save(); if(g_save.empty()){status("Kein ETS2-Spielstand gefunden.");return false;}
  fs::path temp=fs::temp_directory_path()/"obc_job_dispatcher_decrypted.sii";
  SIIDecryptor d; auto r=d.DecryptAndDecodeFileInMemory(g_save.string().c_str(),temp.string().c_str());
  if(r!=rSuccess && r!=rFormatPlainText){status("Spielstand konnte nicht entschluesselt werden.");return false;}
  g_text=read_file(r==rFormatPlainText?g_save:temp); if(g_text.rfind("SiiNunit",0)!=0){status("Unbekanntes SII-Format.");return false;}
  g_depots.clear(); g_offers.clear();
  std::regex depot(R"(company\s*:\s*company\.volatile\.([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)\s*\{)");
  for(auto i=std::sregex_iterator(g_text.begin(),g_text.end(),depot);i!=std::sregex_iterator();++i)g_depots.push_back({(*i)[1],(*i)[2]});
  std::regex block(R"(job_offer_data\s*:\s*[^\{]+\{([^\}]*)\})");
  auto val=[](const std::string& b,const char* key)->std::string {
    std::smatch m;
    std::regex r(std::string("\\b")+key+"\\s*:\\s*\\\"?([^\\r\\n\\\"]+)\\\"?");
    return std::regex_search(b,m,r)?m[1].str():"";
  };
  for(auto i=std::sregex_iterator(g_text.begin(),g_text.end(),block);i!=std::sregex_iterator();++i){
    std::string b=(*i)[1]; Offer o; o.cargo=val(b,"cargo"); o.truck=val(b,"company_truck");o.variant=val(b,"trailer_variant");o.trailerDef=val(b,"trailer_definition");
    std::string u=val(b,"units_count"),km=val(b,"shortest_distance_km"); if(!u.empty())o.units=std::max(1,atoi(u.c_str()));if(!km.empty())o.distance=std::max(1,atoi(km.c_str()));
    if(o.cargo.rfind("cargo.",0)==0&&!o.variant.empty()&&!o.trailerDef.empty())g_offers.push_back(o);
  }
  std::set<std::string> cities,cargos;for(auto& d:g_depots)cities.insert(d.city);for(auto&o:g_offers)cargos.insert(o.cargo.substr(6));
  fill_combo(C_SRC_CITY,cities);fill_combo(C_DST_CITY,cities);fill_combo(C_CARGO,cargos);
  status("Geladen: "+std::to_string(cities.size())+" Staedte, "+std::to_string(g_depots.size())+" Firmen, "+std::to_string(cargos.size())+" Frachten");
  return true;
}
static void update_companies(int cityId,int companyId) {
  std::string c=combo(cityId);std::set<std::string> companies;for(auto&d:g_depots)if(d.city==c)companies.insert(d.company);fill_combo(companyId,companies);
}
static size_t matching_brace(const std::string&s,size_t open){int depth=0;for(size_t i=open;i<s.size();++i){if(s[i]=='{')++depth;else if(s[i]=='}'&&--depth==0)return i;}return std::string::npos;}
static bool create_job() {
  std::string sc=combo(C_SRC_CITY),sp=combo(C_SRC_COMP),dc=combo(C_DST_CITY),dp=combo(C_DST_COMP),cargo="cargo."+combo(C_CARGO);
  if(sc.empty()||sp.empty()||dc.empty()||dp.empty()||cargo=="cargo."){status("Bitte alle Felder auswaehlen.");return false;}
  auto templ=std::find_if(g_offers.begin(),g_offers.end(),[&](auto&o){return o.cargo==cargo;});
  if(templ==g_offers.end()){status("Keine kompatible Trailer-Vorlage fuer diese Fracht gefunden.");return false;}
  std::string marker="company : company.volatile."+sp+"."+sc+" {";size_t begin=g_text.find(marker);if(begin==std::string::npos){status("Abholfirma nicht gefunden.");return false;}
  size_t open=g_text.find('{',begin),end=matching_brace(g_text,open);if(end==std::string::npos){status("Firmenblock ist ungueltig.");return false;}
  std::string cb=g_text.substr(begin,end-begin+1);std::smatch m;std::regex countR(R"(job_offer\s*:\s*(\d+))");if(!std::regex_search(cb,m,countR)){status("Auftragsliste der Firma nicht gefunden.");return false;}
  int count=atoi(m[1].str().c_str());
  auto stamp=(unsigned long long)std::chrono::high_resolution_clock::now().time_since_epoch().count();
  char id[80];sprintf(id,"_nameless.obc.%08llx.%04llx",stamp&0xffffffffULL,(stamp>>32)&0xffffULL);
  cb.replace(m.position(1),m.length(1),std::to_string(count+1));
  size_t insert=cb.rfind('}');std::ostringstream ref;ref<<" job_offer["<<count<<"]: "<<id<<"\r\n";cb.insert(insert,ref.str());
  g_text.replace(begin,end-begin+1,cb);
  char unitsText[32]{}; GetWindowTextA(GetDlgItem(g_window,C_UNITS),unitsText,31);
  int units=atoi(unitsText);if(units<1)units=templ->units;
  std::smatch tm;int gameTime=100000;if(std::regex_search(g_text,tm,std::regex(R"(game_time\s*:\s*(\d+))")))gameTime=atoi(tm[1].str().c_str());
  std::ostringstream job;job<<"\r\njob_offer_data : "<<id<<" {\r\n target: \""<<dp<<"."<<dc<<"\"\r\n expiration_time: "<<(gameTime+2880)
    <<"\r\n urgency: 0\r\n shortest_distance_km: "<<templ->distance<<"\r\n ferry_time: 0\r\n ferry_price: 0\r\n cargo: "<<cargo
    <<"\r\n company_truck: "<<templ->truck<<"\r\n trailer_variant: "<<templ->variant<<"\r\n trailer_definition: "<<templ->trailerDef
    <<"\r\n units_count: "<<units<<"\r\n fill_ratio: 1\r\n trailer_place: 0\r\n}\r\n";
  size_t final=g_text.rfind('}');g_text.insert(final,job.str());
  try {
    fs::path backup=g_save;backup += L".obc-backup";fs::copy_file(g_save,backup,fs::copy_options::overwrite_existing);
    if(!write_file(g_save,g_text)){status("Spielstand konnte nicht geschrieben werden.");return false;}
  } catch(const std::exception&e){status(std::string("Fehler: ")+e.what());return false;}
  status("Auftrag eingefuegt. In ETS2 diesen Spielstand jetzt neu laden.");return true;
}

static HWND label(HWND p,const char*t,int x,int y,int w=190){return CreateWindowA("STATIC",t,WS_CHILD|WS_VISIBLE,x,y,w,20,p,nullptr,g_module,nullptr);}
static HWND comboBox(HWND p,int id,int x,int y,int w=230){return CreateWindowA("COMBOBOX","",WS_CHILD|WS_VISIBLE|CBS_DROPDOWNLIST|WS_VSCROLL,x,y,w,400,p,(HMENU)(INT_PTR)id,g_module,nullptr);}
static LRESULT CALLBACK wndproc(HWND h,UINT msg,WPARAM w,LPARAM l){
  if(msg==WM_CREATE){
    HFONT font=(HFONT)GetStockObject(DEFAULT_GUI_FONT);label(h,"OBC JOB DISPATCHER",24,18,400);label(h,"STRG + 9  |  ETS2 AUFTRAGS-PLUGIN",24,44,400);
    label(h,"Abholstadt",24,82);comboBox(h,C_SRC_CITY,24,103);label(h,"Abholfirma / Fabrik",274,82);comboBox(h,C_SRC_COMP,274,103);
    label(h,"Zielstadt",24,151);comboBox(h,C_DST_CITY,24,172);label(h,"Zielfirma",274,151);comboBox(h,C_DST_COMP,274,172);
    label(h,"Fracht",24,220);comboBox(h,C_CARGO,24,241,300);label(h,"Ladungseinheiten",344,220,150);
    CreateWindowA("EDIT","20",WS_CHILD|WS_VISIBLE|WS_BORDER|ES_NUMBER,344,241,80,25,h,(HMENU)C_UNITS,g_module,nullptr);
    CreateWindowA("BUTTON","Spielstand neu einlesen",WS_CHILD|WS_VISIBLE,24,300,220,38,h,(HMENU)B_SCAN,g_module,nullptr);
    CreateWindowA("BUTTON","AUFTRAG BESTAETIGEN",WS_CHILD|WS_VISIBLE|BS_DEFPUSHBUTTON,264,300,240,38,h,(HMENU)B_CREATE,g_module,nullptr);
    label(h,"Bereit.",24,360,480);EnumChildWindows(h,[](HWND c,LPARAM f)->BOOL{SendMessage(c,WM_SETFONT,f,TRUE);return TRUE;},(LPARAM)font);return 0;
  }
  if(msg==WM_COMMAND){int id=LOWORD(w),code=HIWORD(w);if(id==B_SCAN&&code==BN_CLICKED){load_save();update_companies(C_SRC_CITY,C_SRC_COMP);update_companies(C_DST_CITY,C_DST_COMP);}if(id==B_CREATE&&code==BN_CLICKED)create_job();if(id==C_SRC_CITY&&code==CBN_SELCHANGE)update_companies(C_SRC_CITY,C_SRC_COMP);if(id==C_DST_CITY&&code==CBN_SELCHANGE)update_companies(C_DST_CITY,C_DST_COMP);return 0;}
  if(msg==WM_CLOSE){ShowWindow(h,SW_HIDE);return 0;}if(msg==WM_DESTROY){PostQuitMessage(0);return 0;}return DefWindowProc(h,msg,w,l);
}
static DWORD WINAPI ui_thread(void*){
  INITCOMMONCONTROLSEX ic{sizeof(ic),ICC_UPDOWN_CLASS};InitCommonControlsEx(&ic);WNDCLASSA wc{};wc.lpfnWndProc=wndproc;wc.hInstance=g_module;wc.lpszClassName="OBCJobDispatcher";wc.hCursor=LoadCursor(nullptr,IDC_ARROW);wc.hbrBackground=CreateSolidBrush(RGB(17,23,30));RegisterClassA(&wc);
  g_window=CreateWindowExA(WS_EX_TOPMOST,wc.lpszClassName,"OBC Job Dispatcher 0.1 Plugin",WS_OVERLAPPED|WS_CAPTION|WS_SYSMENU,200,150,550,440,nullptr,nullptr,g_module,nullptr);
  RegisterHotKey(g_window,9,MOD_CONTROL,'9');load_save();update_companies(C_SRC_CITY,C_SRC_COMP);update_companies(C_DST_CITY,C_DST_COMP);
  MSG m{};while(!g_stop&&GetMessage(&m,nullptr,0,0)){if(m.message==WM_HOTKEY){BOOL v=IsWindowVisible(g_window);ShowWindow(g_window,v?SW_HIDE:SW_SHOW);if(!v)SetForegroundWindow(g_window);}TranslateMessage(&m);DispatchMessage(&m);}UnregisterHotKey(g_window,9);return 0;
}

extern "C" SCSAPI_RESULT scs_telemetry_init(const scs_u32_t version,const scs_telemetry_init_params_t*){
  if(version!=SCS_TELEMETRY_VERSION_1_00 && version!=SCS_TELEMETRY_VERSION_1_01)return SCS_RESULT_unsupported;
  g_stop=false;g_thread=CreateThread(nullptr,0,ui_thread,nullptr,0,nullptr);return g_thread?SCS_RESULT_ok:SCS_RESULT_generic_error;
}
extern "C" SCSAPI_VOID scs_telemetry_shutdown(){g_stop=true;if(g_window)PostMessage(g_window,WM_DESTROY,0,0);if(g_thread){WaitForSingleObject(g_thread,2000);CloseHandle(g_thread);g_thread=nullptr;}}
BOOL WINAPI DllMain(HINSTANCE h,DWORD reason,LPVOID){if(reason==DLL_PROCESS_ATTACH){g_module=h;DisableThreadLibraryCalls(h);}return TRUE;}
