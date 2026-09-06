import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const data = [
  {
    "key": "t_auto_0ffd3064",
    "az": "Brandfull — İnsanlar Üçün Əhəmiyyətli İşlər Yaradırıq",
    "en": "Brandfull — İnsanlar Üçün Əhəmiyyətli İşlər Yaradırıq",
    "ru": "Brandfull — İnsanlar Üçün Əhəmiyyətli İşlər Yaradırıq"
  },
  {
    "key": "t_auto_546a9a80",
    "az": "AZ",
    "en": "AZ",
    "ru": "AZ"
  },
  {
    "key": "t_auto_aa85f184",
    "az": "EN",
    "en": "EN",
    "ru": "EN"
  },
  {
    "key": "t_auto_f9308c5d",
    "az": "RU",
    "en": "RU",
    "ru": "RU"
  },
  {
    "key": "t_auto_e0c0587b",
    "az": "Salam",
    "en": "Salam",
    "ru": "Salam"
  },
  {
    "key": "t_auto_848ba90a",
    "az": "Xoş gəlmisiniz. Biznesinizi gələcəyə daşımağa hazırıq.",
    "en": "Xoş gəlmisiniz. Biznesinizi gələcəyə daşımağa hazırıq.",
    "ru": "Xoş gəlmisiniz. Biznesinizi gələcəyə daşımağa hazırıq."
  },
  {
    "key": "t_auto_d53fe027",
    "az": "İşlərimizə baxın.",
    "en": "İşlərimizə baxın.",
    "ru": "İşlərimizə baxın."
  },
  {
    "key": "t_auto_3d993be9",
    "az": "Həllərimizi kəşf edin.",
    "en": "Həllərimizi kəşf edin.",
    "ru": "Həllərimizi kəşf edin."
  },
  {
    "key": "t_auto_c1db971d",
    "az": "Yanaşmamıza baxın.",
    "en": "Yanaşmamıza baxın.",
    "ru": "Yanaşmamıza baxın."
  },
  {
    "key": "t_auto_f751f038",
    "az": "Son fikirlər və xəbərlər.",
    "en": "Son fikirlər və xəbərlər.",
    "ru": "Son fikirlər və xəbərlər."
  },
  {
    "key": "t_auto_693b90b2",
    "az": "Brandfull haqqında.",
    "en": "Brandfull haqqında.",
    "ru": "Brandfull haqqında."
  },
  {
    "key": "t_auto_5f4e0b75",
    "az": "Bizə qoşulmaq istəyirsiniz?",
    "en": "Bizə qoşulmaq istəyirsiniz?",
    "ru": "Bizə qoşulmaq istəyirsiniz?"
  },
  {
    "key": "t_auto_bd16d4a7",
    "az": "NBCU",
    "en": "NBCU",
    "ru": "NBCU"
  },
  {
    "key": "t_auto_e7965a3a",
    "az": "Süni intellektlə maneəsiz kəşfiyyat və cədvəl sistemi.",
    "en": "Süni intellektlə maneəsiz kəşfiyyat və cədvəl sistemi.",
    "ru": "Süni intellektlə maneəsiz kəşfiyyat və cədvəl sistemi."
  },
  {
    "key": "t_auto_dbf60d51",
    "az": "CoinTracker",
    "en": "CoinTracker",
    "ru": "CoinTracker"
  },
  {
    "key": "t_auto_d5d088ab",
    "az": "Kripto vergi hesabatlığı, asanlaşdırıldı.",
    "en": "Kripto vergi hesabatlığı, asanlaşdırıldı.",
    "ru": "Kripto vergi hesabatlığı, asanlaşdırıldı."
  },
  {
    "key": "t_auto_d673372a",
    "az": "Big Green Egg",
    "en": "Big Green Egg",
    "ru": "Big Green Egg"
  },
  {
    "key": "t_auto_410eefb0",
    "az": "Lüks BBQ brendi üçün e-ticarət və kulinariya sintezi.",
    "en": "Lüks BBQ brendi üçün e-ticarət və kulinariya sintezi.",
    "ru": "Lüks BBQ brendi üçün e-ticarət və kulinariya sintezi."
  },
  {
    "key": "t_auto_8b36e920",
    "az": "Google",
    "en": "Google",
    "ru": "Google"
  },
  {
    "key": "t_auto_b2d32a68",
    "az": "14+ illik tərəfdaşlıq və qlobal innovasiya platformaları.",
    "en": "14+ illik tərəfdaşlıq və qlobal innovasiya platformaları.",
    "ru": "14+ illik tərəfdaşlıq və qlobal innovasiya platformaları."
  },
  {
    "key": "t_auto_c46ed8bd",
    "az": "Heç vaxt təsadüfi deyil.",
    "en": "Heç vaxt təsadüfi deyil.",
    "ru": "Heç vaxt təsadüfi deyil."
  },
  {
    "key": "t_auto_9eb343e5",
    "az": "Müştərilərimizlə gələcəyi birgə qurur, təsirini ölçür və yenidən təkrarlayırıq.",
    "en": "Müştərilərimizlə gələcəyi birgə qurur, təsirini ölçür və yenidən təkrarlayırıq.",
    "ru": "Müştərilərimizlə gələcəyi birgə qurur, təsirini ölçür və yenidən təkrarlayırıq."
  },
  {
    "key": "t_auto_6cf3eb76",
    "az": "Daimi yenilənmə və çoxşaxəli bizneslər.",
    "en": "Daimi yenilənmə və çoxşaxəli bizneslər.",
    "ru": "Daimi yenilənmə və çoxşaxəli bizneslər."
  },
  {
    "key": "t_auto_32430969",
    "az": "Hublot",
    "en": "Hublot",
    "ru": "Hublot"
  },
  {
    "key": "t_auto_59cfd184",
    "az": "Yeni rəqəmsal brend ifadəsi.",
    "en": "Yeni rəqəmsal brend ifadəsi.",
    "ru": "Yeni rəqəmsal brend ifadəsi."
  },
  {
    "key": "t_auto_58c0a0e9",
    "az": "LINK",
    "en": "LINK",
    "ru": "LINK"
  },
  {
    "key": "t_auto_7c94e537",
    "az": "İntellektual rəqəmsal məhsullar paketi.",
    "en": "İntellektual rəqəmsal məhsullar paketi.",
    "ru": "İntellektual rəqəmsal məhsullar paketi."
  },
  {
    "key": "t_auto_3bc5e0b6",
    "az": "The Ring",
    "en": "The Ring",
    "ru": "The Ring"
  },
  {
    "key": "t_auto_8238eea3",
    "az": "Qlobal idman azarkeşlərini cəlb edən təcrübələr.",
    "en": "Qlobal idman azarkeşlərini cəlb edən təcrübələr.",
    "ru": "Qlobal idman azarkeşlərini cəlb edən təcrübələr."
  },
  {
    "key": "t_auto_113ee4f5",
    "az": "AI Əsaslı. Sistemli. Ekspertlərin İdarəçiliyində. İdeyaları real təsirə çevirən qabiliyyətlər.",
    "en": "AI Əsaslı. Sistemli. Ekspertlərin İdarəçiliyində. İdeyaları real təsirə çevirən qabiliyyətlər.",
    "ru": "AI Əsaslı. Sistemli. Ekspertlərin İdarəçiliyində. İdeyaları real təsirə çevirən qabiliyyətlər."
  },
  {
    "key": "t_auto_342c819e",
    "az": "Brend strategiyası və dizayn.",
    "en": "Brend strategiyası və dizayn.",
    "ru": "Brend strategiyası və dizayn."
  },
  {
    "key": "t_auto_62137824",
    "az": "Mədəniyyətlə birgə addımlayan brendlər. →",
    "en": "Mədəniyyətlə birgə addımlayan brendlər. →",
    "ru": "Mədəniyyətlə birgə addımlayan brendlər. →"
  },
  {
    "key": "t_auto_d12d7aba",
    "az": "Marketinq və məzmun.",
    "en": "Marketinq və məzmun.",
    "ru": "Marketinq və məzmun."
  },
  {
    "key": "t_auto_ca5a7e04",
    "az": "Səs-küyü yaran dərin strateji anlayış və yaradıcılıq. →",
    "en": "Səs-küyü yaran dərin strateji anlayış və yaradıcılıq. →",
    "ru": "Səs-küyü yaran dərin strateji anlayış və yaradıcılıq. →"
  },
  {
    "key": "t_auto_38263611",
    "az": "Məhsullar və platformalar.",
    "en": "Məhsullar və platformalar.",
    "ru": "Məhsullar və platformalar."
  },
  {
    "key": "t_auto_99798897",
    "az": "İdeyadan sürətli istifadəyə və qlobal tətbiqə. →",
    "en": "İdeyadan sürətli istifadəyə və qlobal tətbiqə. →",
    "ru": "İdeyadan sürətli istifadəyə və qlobal tətbiqə. →"
  },
  {
    "key": "t_auto_2e9b612f",
    "az": "Kompozisiya e-ticarəti.",
    "en": "Kompozisiya e-ticarəti.",
    "ru": "Kompozisiya e-ticarəti."
  },
  {
    "key": "t_auto_fb90583a",
    "az": "Gəliri artıran və miqyaslanan çevik ticarət infrastrukturu. →",
    "en": "Gəliri artıran və miqyaslanan çevik ticarət infrastrukturu. →",
    "ru": "Gəliri artıran və miqyaslanan çevik ticarət infrastrukturu. →"
  },
  {
    "key": "t_auto_3794ce70",
    "az": "Müştəri təcrübəsi (CX).",
    "en": "Müştəri təcrübəsi (CX).",
    "ru": "Müştəri təcrübəsi (CX)."
  },
  {
    "key": "t_auto_0b84321f",
    "az": "İnsanları brendlə bağlayan unudulmaz təcrübələr. →",
    "en": "İnsanları brendlə bağlayan unudulmaz təcrübələr. →",
    "ru": "İnsanları brendlə bağlayan unudulmaz təcrübələr. →"
  },
  {
    "key": "t_auto_f80854e3",
    "az": "Süni intellekt aktivasiyası.",
    "en": "Süni intellekt aktivasiyası.",
    "ru": "Süni intellekt aktivasiyası."
  },
  {
    "key": "t_auto_8973faa5",
    "az": "Komandaların işləmə tərzini dəyişirik. →",
    "en": "Komandaların işləmə tərzini dəyişirik. →",
    "ru": "Komandaların işləmə tərzini dəyişirik. →"
  },
  {
    "key": "t_auto_51c96b66",
    "az": "İşlərimiz",
    "en": "İşlərimiz",
    "ru": "İşlərimiz"
  },
  {
    "key": "t_auto_07e6a81b",
    "az": "Əlaqə",
    "en": "Əlaqə",
    "ru": "Əlaqə"
  },
  {
    "key": "t_auto_8405002c",
    "az": "Gələcəyi birlikdə quraq",
    "en": "Gələcəyi birlikdə quraq",
    "ru": "Gələcəyi birlikdə quraq"
  },
  {
    "key": "t_auto_ae1151d4",
    "az": "İddialı bir layihəniz var? Birbaşa rəhbərliyimiz və tərəfdaşlıq komandamızla əlaqə saxlayın.",
    "en": "İddialı bir layihəniz var? Birbaşa rəhbərliyimiz və tərəfdaşlıq komandamızla əlaqə saxlayın.",
    "ru": "İddialı bir layihəniz var? Birbaşa rəhbərliyimiz və tərəfdaşlıq komandamızla əlaqə saxlayın."
  },
  {
    "key": "t_auto_4a954920",
    "az": "Dialoqa Başlayın",
    "en": "Dialoqa Başlayın",
    "ru": "Dialoqa Başlayın"
  },
  {
    "key": "t_auto_72f896f0",
    "az": "Müraciət formasını doldurun və ya aşağıdakı birbaşa əlaqə vasitələrimizlə bizə yazın.",
    "en": "Müraciət formasını doldurun və ya aşağıdakı birbaşa əlaqə vasitələrimizlə bizə yazın.",
    "ru": "Müraciət formasını doldurun və ya aşağıdakı birbaşa əlaqə vasitələrimizlə bizə yazın."
  },
  {
    "key": "t_auto_a66213dc",
    "az": "Yeni Biznes və Tərəfdaşlıq",
    "en": "Yeni Biznes və Tərəfdaşlıq",
    "ru": "Yeni Biznes və Tərəfdaşlıq"
  },
  {
    "key": "t_auto_9f96e730",
    "az": "business@brandfull.com",
    "en": "business@brandfull.com",
    "ru": "business@brandfull.com"
  },
  {
    "key": "t_auto_15983790",
    "az": "Media və Mətbuat",
    "en": "Media və Mətbuat",
    "ru": "Media və Mətbuat"
  },
  {
    "key": "t_auto_22f610d3",
    "az": "press@brandfull.com",
    "en": "press@brandfull.com",
    "ru": "press@brandfull.com"
  },
  {
    "key": "t_auto_d94f72dc",
    "az": "Baş Qərargah",
    "en": "Baş Qərargah",
    "ru": "Baş Qərargah"
  },
  {
    "key": "t_auto_85ad4640",
    "az": "Nizami küç. 142, Landmark Plaza, Bakı",
    "en": "Nizami küç. 142, Landmark Plaza, Bakı",
    "ru": "Nizami küç. 142, Landmark Plaza, Bakı"
  },
  {
    "key": "t_auto_5c4b6fbd",
    "az": "Ad və Soyadınız *",
    "en": "Ad və Soyadınız *",
    "ru": "Ad və Soyadınız *"
  },
  {
    "key": "t_auto_0fb06322",
    "az": "İş E-poçtunuz *",
    "en": "İş E-poçtunuz *",
    "ru": "İş E-poçtunuz *"
  },
  {
    "key": "t_auto_a2ca7d86",
    "az": "Şirkət / Təşkilat",
    "en": "Şirkət / Təşkilat",
    "ru": "Şirkət / Təşkilat"
  },
  {
    "key": "t_auto_b603fa4b",
    "az": "Sizə necə kömək edə bilərik?",
    "en": "Sizə necə kömək edə bilərik?",
    "ru": "Sizə necə kömək edə bilərik?"
  },
  {
    "key": "t_auto_1c081262",
    "az": "Mesajı Göndər",
    "en": "Mesajı Göndər",
    "ru": "Mesajı Göndər"
  },
  {
    "key": "t_auto_4ce704b1",
    "az": "Müraciətiniz Qəbul Olundu!",
    "en": "Müraciətiniz Qəbul Olundu!",
    "ru": "Müraciətiniz Qəbul Olundu!"
  },
  {
    "key": "t_auto_220d099b",
    "az": "Təşəkkür edirik. Əməkdaşlıq komandamız 24 saat ərzində sizinlə əlaqə saxlayacaq.",
    "en": "Təşəkkür edirik. Əməkdaşlıq komandamız 24 saat ərzində sizinlə əlaqə saxlayacaq.",
    "ru": "Təşəkkür edirik. Əməkdaşlıq komandamız 24 saat ərzində sizinlə əlaqə saxlayacaq."
  },
  {
    "key": "t_auto_b28e62f1",
    "az": "Portfelimiz",
    "en": "Portfelimiz",
    "ru": "Portfelimiz"
  },
  {
    "key": "t_auto_09c490e8",
    "az": "Təcrübələri yenidən təsəvvür edən, nəticələri sürətləndirən və tapdığımızdan daha yaxşı qoyan işlər.",
    "en": "Təcrübələri yenidən təsəvvür edən, nəticələri sürətləndirən və tapdığımızdan daha yaxşı qoyan işlər.",
    "ru": "Təcrübələri yenidən təsəvvür edən, nəticələri sürətləndirən və tapdığımızdan daha yaxşı qoyan işlər."
  },
  {
    "key": "t_auto_e4d05cd7",
    "az": "Bütün İşlər",
    "en": "Bütün İşlər",
    "ru": "Bütün İşlər"
  },
  {
    "key": "t_auto_11fa593a",
    "az": "AI və Platformalar",
    "en": "AI və Platformalar",
    "ru": "AI və Platformalar"
  },
  {
    "key": "t_auto_fcbf90c5",
    "az": "Brend Strategiyası",
    "en": "Brend Strategiyası",
    "ru": "Brend Strategiyası"
  },
  {
    "key": "t_auto_09278b85",
    "az": "E-ticarət",
    "en": "E-ticarət",
    "ru": "E-ticarət"
  },
  {
    "key": "t_auto_9e683885",
    "az": "Müştəri Təcrübəsi",
    "en": "Müştəri Təcrübəsi",
    "ru": "Müştəri Təcrübəsi"
  },
  {
    "key": "t_auto_ae090237",
    "az": "Xidmətlər",
    "en": "Xidmətlər",
    "ru": "Xidmətlər"
  },
  {
    "key": "t_auto_89c101ed",
    "az": "Həllərimiz",
    "en": "Həllərimiz",
    "ru": "Həllərimiz"
  },
  {
    "key": "t_auto_da72c6ce",
    "az": "Metodologiya",
    "en": "Metodologiya",
    "ru": "Metodologiya"
  },
  {
    "key": "t_auto_c75f0c47",
    "az": "Yanaşma",
    "en": "Yanaşma",
    "ru": "Yanaşma"
  },
  {
    "key": "t_auto_f292a04f",
    "az": "Biz düşünülmüş bir proses, güclü bir komanda və ölçülə bilən nəticələrə inanırıq. İşimiz — strategiyadan icraya qədər hər mərhələdə əhəmiyyət kəsb edir.",
    "en": "Biz düşünülmüş bir proses, güclü bir komanda və ölçülə bilən nəticələrə inanırıq. İşimiz — strategiyadan icraya qədər hər mərhələdə əhəmiyyət kəsb edir.",
    "ru": "Biz düşünülmüş bir proses, güclü bir komanda və ölçülə bilən nəticələrə inanırıq. İşimiz — strategiyadan icraya qədər hər mərhələdə əhəmiyyət kəsb edir."
  },
  {
    "key": "t_auto_439a046b",
    "az": "01 — Kəşfiyyat",
    "en": "01 — Kəşfiyyat",
    "ru": "01 — Kəşfiyyat"
  },
  {
    "key": "t_auto_509dd43c",
    "az": "Problemi dərindən anlayırıq.",
    "en": "Problemi dərindən anlayırıq.",
    "ru": "Problemi dərindən anlayırıq."
  },
  {
    "key": "t_auto_ad41a334",
    "az": "Layihəyə başlamazdan əvvəl auditoriya araşdırması, bazarın analizi, rəqib mühitinin qiymətləndirilməsi keçiririk. Bu mərhələ ən vacib mərhələdir.",
    "en": "Layihəyə başlamazdan əvvəl auditoriya araşdırması, bazarın analizi, rəqib mühitinin qiymətləndirilməsi keçiririk. Bu mərhələ ən vacib mərhələdir.",
    "ru": "Layihəyə başlamazdan əvvəl auditoriya araşdırması, bazarın analizi, rəqib mühitinin qiymətləndirilməsi keçiririk. Bu mərhələ ən vacib mərhələdir."
  },
  {
    "key": "t_auto_76bfdd07",
    "az": "02 — Strategiya",
    "en": "02 — Strategiya",
    "ru": "02 — Strategiya"
  },
  {
    "key": "t_auto_3151eac6",
    "az": "Vizyon yaradırıq.",
    "en": "Vizyon yaradırıq.",
    "ru": "Vizyon yaradırıq."
  },
  {
    "key": "t_auto_52dd88f1",
    "az": "Faktlara əsaslanan dərin strategiyanı hazırlayaraq, brendin uzunmüddətli inkişafını planlaşdırırıq. Hər qərar data ilə dəstəklənir.",
    "en": "Faktlara əsaslanan dərin strategiyanı hazırlayaraq, brendin uzunmüddətli inkişafını planlaşdırırıq. Hər qərar data ilə dəstəklənir.",
    "ru": "Faktlara əsaslanan dərin strategiyanı hazırlayaraq, brendin uzunmüddətli inkişafını planlaşdırırıq. Hər qərar data ilə dəstəklənir."
  },
  {
    "key": "t_auto_880ca620",
    "az": "03 — Dizayn və İcra",
    "en": "03 — Dizayn və İcra",
    "ru": "03 — Dizayn və İcra"
  },
  {
    "key": "t_auto_d9b2182b",
    "az": "Həyata keçiririk.",
    "en": "Həyata keçiririk.",
    "ru": "Həyata keçiririk."
  },
  {
    "key": "t_auto_b6e60df5",
    "az": "Strategiyanı vizual ünsürlərə, məhsullara, rəqəmsal təcrübələrə çeviririk. Hər piksel diqqətlə düşünülmüşdür.",
    "en": "Strategiyanı vizual ünsürlərə, məhsullara, rəqəmsal təcrübələrə çeviririk. Hər piksel diqqətlə düşünülmüşdür.",
    "ru": "Strategiyanı vizual ünsürlərə, məhsullara, rəqəmsal təcrübələrə çeviririk. Hər piksel diqqətlə düşünülmüşdür."
  },
  {
    "key": "t_auto_dcbf151f",
    "az": "04 — Ölçmə",
    "en": "04 — Ölçmə",
    "ru": "04 — Ölçmə"
  },
  {
    "key": "t_auto_3ff8a360",
    "az": "Nəticəni ölçürük.",
    "en": "Nəticəni ölçürük.",
    "ru": "Nəticəni ölçürük."
  },
  {
    "key": "t_auto_be39a0aa",
    "az": "Hər layihənin təsirini izləyirik — KPI-lar, NPS, dönüşüm nisbətləri. Nəticə yaxşılaşdırmaq üçün daim optimallaşdırırıq.",
    "en": "Hər layihənin təsirini izləyirik — KPI-lar, NPS, dönüşüm nisbətləri. Nəticə yaxşılaşdırmaq üçün daim optimallaşdırırıq.",
    "ru": "Hər layihənin təsirini izləyirik — KPI-lar, NPS, dönüşüm nisbətləri. Nəticə yaxşılaşdırmaq üçün daim optimallaşdırırıq."
  },
  {
    "key": "t_auto_58ed01b8",
    "az": "Biz kimik",
    "en": "Biz kimik",
    "ru": "Biz kimik"
  },
  {
    "key": "t_auto_e55a74ca",
    "az": "Haqqımızda",
    "en": "Haqqımızda",
    "ru": "Haqqımızda"
  },
  {
    "key": "t_auto_a5a7832c",
    "az": "Brandfull — insanlar, bizneslər və gələcək üçün əhəmiyyətli işlər yaradan qlobal bir yaradıcılıq şirkətidir.",
    "en": "Brandfull — insanlar, bizneslər və gələcək üçün əhəmiyyətli işlər yaradan qlobal bir yaradıcılıq şirkətidir.",
    "ru": "Brandfull — insanlar, bizneslər və gələcək üçün əhəmiyyətli işlər yaradan qlobal bir yaradıcılıq şirkətidir."
  },
  {
    "key": "t_auto_4d5ef76f",
    "az": "Missiyamız",
    "en": "Missiyamız",
    "ru": "Missiyamız"
  },
  {
    "key": "t_auto_c2148d2c",
    "az": "İnsanlar üçün əhəmiyyətli olan işlər yaratmaq.",
    "en": "İnsanlar üçün əhəmiyyətli olan işlər yaratmaq.",
    "ru": "İnsanlar üçün əhəmiyyətli olan işlər yaratmaq."
  },
  {
    "key": "t_auto_98e8c513",
    "az": "Hər layihədə insanın həyatına toxunan, brendlərə dəyər qatan və ölçülə bilən nəticə verən işlər yaradırıq.",
    "en": "Hər layihədə insanın həyatına toxunan, brendlərə dəyər qatan və ölçülə bilən nəticə verən işlər yaradırıq.",
    "ru": "Hər layihədə insanın həyatına toxunan, brendlərə dəyər qatan və ölçülə bilən nəticə verən işlər yaradırıq."
  },
  {
    "key": "t_auto_2bfeb083",
    "az": "Vizyonumuz",
    "en": "Vizyonumuz",
    "ru": "Vizyonumuz"
  },
  {
    "key": "t_auto_3cfcd3ee",
    "az": "Gələcəyin ən güvənilir yaradıcılıq tərəfdaşı olmaq.",
    "en": "Gələcəyin ən güvənilir yaradıcılıq tərəfdaşı olmaq.",
    "ru": "Gələcəyin ən güvənilir yaradıcılıq tərəfdaşı olmaq."
  },
  {
    "key": "t_auto_b7140db1",
    "az": "İnnovasiya, etika və estetikanın kəsişdiyi yerdə dünya brendlərinin rəqəmsal transformasiyasına liderlik etmək.",
    "en": "İnnovasiya, etika və estetikanın kəsişdiyi yerdə dünya brendlərinin rəqəmsal transformasiyasına liderlik etmək.",
    "ru": "İnnovasiya, etika və estetikanın kəsişdiyi yerdə dünya brendlərinin rəqəmsal transformasiyasına liderlik etmək."
  },
  {
    "key": "t_auto_9250e384",
    "az": "İl Təcrübə",
    "en": "İl Təcrübə",
    "ru": "İl Təcrübə"
  },
  {
    "key": "t_auto_105fb4f7",
    "az": "Layihə",
    "en": "Layihə",
    "ru": "Layihə"
  },
  {
    "key": "t_auto_e429a0f7",
    "az": "Mütəxəssis",
    "en": "Mütəxəssis",
    "ru": "Mütəxəssis"
  },
  {
    "key": "t_auto_e6a62db1",
    "az": "Məmnuniyyət",
    "en": "Məmnuniyyət",
    "ru": "Məmnuniyyət"
  },
  {
    "key": "t_auto_87d0852b",
    "az": "Ofislərimiz",
    "en": "Ofislərimiz",
    "ru": "Ofislərimiz"
  },
  {
    "key": "t_auto_03a663a3",
    "az": "Tariximiz",
    "en": "Tariximiz",
    "ru": "Tariximiz"
  },
  {
    "key": "t_auto_ea3636fb",
    "az": "Məqalələr",
    "en": "Məqalələr",
    "ru": "Məqalələr"
  },
  {
    "key": "t_auto_c1f4b039",
    "az": "Fikirlər",
    "en": "Fikirlər",
    "ru": "Fikirlər"
  },
  {
    "key": "t_auto_6ab718ae",
    "az": "Brend, texnologiya, dizayn və gələcək haqqında düşüncələrimiz.",
    "en": "Brend, texnologiya, dizayn və gələcək haqqında düşüncələrimiz.",
    "ru": "Brend, texnologiya, dizayn və gələcək haqqında düşüncələrimiz."
  },
  {
    "key": "t_auto_810169b6",
    "az": "Komandamıza qoşulun",
    "en": "Komandamıza qoşulun",
    "ru": "Komandamıza qoşulun"
  },
  {
    "key": "t_auto_daac41ed",
    "az": "Karyera",
    "en": "Karyera",
    "ru": "Karyera"
  },
  {
    "key": "t_auto_b5392251",
    "az": "Brandfull-da işləmək — böyük brendlər üçün dərin bir iş etmək deməkdir. Yaradıcı, cəsarətli və meraqlı insanları axtarırıq.",
    "en": "Brandfull-da işləmək — böyük brendlər üçün dərin bir iş etmək deməkdir. Yaradıcı, cəsarətli və meraqlı insanları axtarırıq.",
    "ru": "Brandfull-da işləmək — böyük brendlər üçün dərin bir iş etmək deməkdir. Yaradıcı, cəsarətli və meraqlı insanları axtarırıq."
  },
  {
    "key": "t_auto_a50abffa",
    "az": "Açıq Vəzifələr",
    "en": "Açıq Vəzifələr",
    "ru": "Açıq Vəzifələr"
  },
  {
    "key": "t_auto_5806fd7a",
    "az": "Niyə Brandfull?",
    "en": "Niyə Brandfull?",
    "ru": "Niyə Brandfull?"
  },
  {
    "key": "t_auto_51af4f8e",
    "az": "Dərin İş",
    "en": "Dərin İş",
    "ru": "Dərin İş"
  },
  {
    "key": "t_auto_37014e8b",
    "az": "Dünya brendlərinin ən vacib problemlərini həll edirsiniz. Hər layihə portfelinizə dəyər qatır.",
    "en": "Dünya brendlərinin ən vacib problemlərini həll edirsiniz. Hər layihə portfelinizə dəyər qatır.",
    "ru": "Dünya brendlərinin ən vacib problemlərini həll edirsiniz. Hər layihə portfelinizə dəyər qatır."
  },
  {
    "key": "t_auto_cc32f025",
    "az": "Çevik Mühit",
    "en": "Çevik Mühit",
    "ru": "Çevik Mühit"
  },
  {
    "key": "t_auto_e4458eee",
    "az": "Uzaqdan iş imkanı, çevik iş saatları, autonomiya. Ən yaxşı işinizi ən yaxşı mühitdə görün.",
    "en": "Uzaqdan iş imkanı, çevik iş saatları, autonomiya. Ən yaxşı işinizi ən yaxşı mühitdə görün.",
    "ru": "Uzaqdan iş imkanı, çevik iş saatları, autonomiya. Ən yaxşı işinizi ən yaxşı mühitdə görün."
  },
  {
    "key": "t_auto_048811fa",
    "az": "İnkişaf Dəstəyi",
    "en": "İnkişaf Dəstəyi",
    "ru": "İnkişaf Dəstəyi"
  },
  {
    "key": "t_auto_bda4432c",
    "az": "Konfrans, kurs, sertifikat xərcləri şirkət tərəfindən ödənilir. Öyrənmək bizim mədəniyyətimizdir.",
    "en": "Konfrans, kurs, sertifikat xərcləri şirkət tərəfindən ödənilir. Öyrənmək bizim mədəniyyətimizdir.",
    "ru": "Konfrans, kurs, sertifikat xərcləri şirkət tərəfindən ödənilir. Öyrənmək bizim mədəniyyətimizdir."
  },
  {
    "key": "t_auto_eb4fde63",
    "az": "Görüşərik",
    "en": "Görüşərik",
    "ru": "Görüşərik"
  },
  {
    "key": "t_auto_b4265f95",
    "az": "İşlərimiz.",
    "en": "İşlərimiz.",
    "ru": "İşlərimiz."
  },
  {
    "key": "t_auto_526b246d",
    "az": "Həllər.",
    "en": "Həllər.",
    "ru": "Həllər."
  },
  {
    "key": "t_auto_d7e4c2be",
    "az": "Yanaşma.",
    "en": "Yanaşma.",
    "ru": "Yanaşma."
  },
  {
    "key": "t_auto_2f3989b2",
    "az": "Haqqımızda.",
    "en": "Haqqımızda.",
    "ru": "Haqqımızda."
  },
  {
    "key": "t_auto_d90f7544",
    "az": "Fikirlər.",
    "en": "Fikirlər.",
    "ru": "Fikirlər."
  },
  {
    "key": "t_auto_0d07146f",
    "az": "Karyera.",
    "en": "Karyera.",
    "ru": "Karyera."
  },
  {
    "key": "t_auto_61187952",
    "az": "Bizə qoşulun.",
    "en": "Bizə qoşulun.",
    "ru": "Bizə qoşulun."
  },
  {
    "key": "t_auto_aec7ec2d",
    "az": "Bizimlə əlaqə.",
    "en": "Bizimlə əlaqə.",
    "ru": "Bizimlə əlaqə."
  },
  {
    "key": "t_auto_07ec054f",
    "az": "Yeniliklərdən xəbərdar olun.",
    "en": "Yeniliklərdən xəbərdar olun.",
    "ru": "Yeniliklərdən xəbərdar olun."
  },
  {
    "key": "t_auto_a317845d",
    "az": "E-poçtunuzun məxfiliyinə hörmət edirik.",
    "en": "E-poçtunuzun məxfiliyinə hörmət edirik.",
    "ru": "E-poçtunuzun məxfiliyinə hörmət edirik."
  },
  {
    "key": "t_auto_ea573298",
    "az": "Məxfilik siyasətimizə baxın.",
    "en": "Məxfilik siyasətimizə baxın.",
    "ru": "Məxfilik siyasətimizə baxın."
  },
  {
    "key": "t_auto_802b6085",
    "az": "Müəllif hüquqları © 2026 Brandfull. Bütün hüquqlar qorunur.",
    "en": "Müəllif hüquqları © 2026 Brandfull. Bütün hüquqlar qorunur.",
    "ru": "Müəllif hüquqları © 2026 Brandfull. Bütün hüquqlar qorunur."
  },
  {
    "key": "t_auto_3a267e91",
    "az": "Məxfilik.",
    "en": "Məxfilik.",
    "ru": "Məxfilik."
  },
  {
    "key": "t_auto_d4cd7c8d",
    "az": "\"Bütün Kukiləri Qəbul Et\" düyməsinə klikləməklə, sayt naviqasiyasını təkmilləşdirmək, saytdan istifadəni təhlil etmək və marketinq fəaliyyətlərimizə dəstək olmaq məqsədilə kukilərin cihazınızda saxlanmasına razılıq verirsiniz.",
    "en": "\"Bütün Kukiləri Qəbul Et\" düyməsinə klikləməklə, sayt naviqasiyasını təkmilləşdirmək, saytdan istifadəni təhlil etmək və marketinq fəaliyyətlərimizə dəstək olmaq məqsədilə kukilərin cihazınızda saxlanmasına razılıq verirsiniz.",
    "ru": "\"Bütün Kukiləri Qəbul Et\" düyməsinə klikləməklə, sayt naviqasiyasını təkmilləşdirmək, saytdan istifadəni təhlil etmək və marketinq fəaliyyətlərimizə dəstək olmaq məqsədilə kukilərin cihazınızda saxlanmasına razılıq verirsiniz."
  },
  {
    "key": "t_auto_ef2e4401",
    "az": "Kuki Tənzimləmələri",
    "en": "Kuki Tənzimləmələri",
    "ru": "Kuki Tənzimləmələri"
  },
  {
    "key": "t_auto_7e56ba81",
    "az": "Hamısını Rədd Et",
    "en": "Hamısını Rədd Et",
    "ru": "Hamısını Rədd Et"
  },
  {
    "key": "t_auto_fd74216c",
    "az": "Bütün Kukiləri Qəbul Et",
    "en": "Bütün Kukiləri Qəbul Et",
    "ru": "Bütün Kukiləri Qəbul Et"
  },
  {
    "key": "t_auto_1bc64a17",
    "az": "Kuki Tərcihləri",
    "en": "Kuki Tərcihləri",
    "ru": "Kuki Tərcihləri"
  },
  {
    "key": "t_auto_4cb513a9",
    "az": "Saytımızın düzgün və rahat işləməsi üçün hansı kuki kateqoriyalarına icazə verdiyinizi seçə bilərsiniz.",
    "en": "Saytımızın düzgün və rahat işləməsi üçün hansı kuki kateqoriyalarına icazə verdiyinizi seçə bilərsiniz.",
    "ru": "Saytımızın düzgün və rahat işləməsi üçün hansı kuki kateqoriyalarına icazə verdiyinizi seçə bilərsiniz."
  },
  {
    "key": "t_auto_ac93894e",
    "az": "Zəruri Kukilər",
    "en": "Zəruri Kukilər",
    "ru": "Zəruri Kukilər"
  },
  {
    "key": "t_auto_83d2b67f",
    "az": "Saytın əsas funksiyaları və təhlükəsizlik üçün mütləqdir.",
    "en": "Saytın əsas funksiyaları və təhlükəsizlik üçün mütləqdir.",
    "ru": "Saytın əsas funksiyaları və təhlükəsizlik üçün mütləqdir."
  },
  {
    "key": "t_auto_baec4ee9",
    "az": "Həmişə Aktiv",
    "en": "Həmişə Aktiv",
    "ru": "Həmişə Aktiv"
  },
  {
    "key": "t_auto_657df288",
    "az": "Analitika və Performans",
    "en": "Analitika və Performans",
    "ru": "Analitika və Performans"
  },
  {
    "key": "t_auto_863a0a84",
    "az": "Ziyarətçilərin saytdan necə istifadə etdiyini anlamağa kömək edir.",
    "en": "Ziyarətçilərin saytdan necə istifadə etdiyini anlamağa kömək edir.",
    "ru": "Ziyarətçilərin saytdan necə istifadə etdiyini anlamağa kömək edir."
  },
  {
    "key": "t_auto_cf8c030c",
    "az": "Fərdiləşdirmə və Marketinq",
    "en": "Fərdiləşdirmə və Marketinq",
    "ru": "Fərdiləşdirmə və Marketinq"
  },
  {
    "key": "t_auto_e45c82c0",
    "az": "Sizə uyğun təklif və məzmun göstərilməsini təmin edir.",
    "en": "Sizə uyğun təklif və məzmun göstərilməsini təmin edir.",
    "ru": "Sizə uyğun təklif və məzmun göstərilməsini təmin edir."
  },
  {
    "key": "t_auto_e2f58041",
    "az": "Seçimləri Yadda Saxla",
    "en": "Seçimləri Yadda Saxla",
    "ru": "Seçimləri Yadda Saxla"
  },
  {
    "key": "t_auto_7fb3b898",
    "az": "Hamısını Qəbul Et",
    "en": "Hamısını Qəbul Et",
    "ru": "Hamısını Qəbul Et"
  },
  {
    "key": "t_auto_afcb0237",
    "az": "Karyera Müraciəti",
    "en": "Karyera Müraciəti",
    "ru": "Karyera Müraciəti"
  },
  {
    "key": "t_auto_2de7125d",
    "az": "Vəzifə Adı",
    "en": "Vəzifə Adı",
    "ru": "Vəzifə Adı"
  },
  {
    "key": "t_auto_2abaae04",
    "az": "Tam Ştat · Bakı",
    "en": "Tam Ştat · Bakı",
    "ru": "Tam Ştat · Bakı"
  },
  {
    "key": "t_auto_f5b02a7a",
    "az": "AD VƏ SOYADINIZ *",
    "en": "AD VƏ SOYADINIZ *",
    "ru": "AD VƏ SOYADINIZ *"
  },
  {
    "key": "t_auto_00456268",
    "az": "E-POÇT *",
    "en": "E-POÇT *",
    "ru": "E-POÇT *"
  },
  {
    "key": "t_auto_0de73260",
    "az": "TELEFON",
    "en": "TELEFON",
    "ru": "TELEFON"
  },
  {
    "key": "t_auto_af1a0b1c",
    "az": "MESAJINIZ",
    "en": "MESAJINIZ",
    "ru": "MESAJINIZ"
  },
  {
    "key": "t_auto_34fc037f",
    "az": "CV FAYLI (PDF, DOC, DOCX - Maks. 10MB) *",
    "en": "CV FAYLI (PDF, DOC, DOCX - Maks. 10MB) *",
    "ru": "CV FAYLI (PDF, DOC, DOCX - Maks. 10MB) *"
  },
  {
    "key": "t_auto_9052d354",
    "az": "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.",
    "en": "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.",
    "ru": "Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin."
  },
  {
    "key": "t_auto_a93c3ff6",
    "az": "Müraciəti Göndər",
    "en": "Müraciəti Göndər",
    "ru": "Müraciəti Göndər"
  },
  {
    "key": "t_auto_e439888e",
    "az": "Müraciətiniz Qeydə Alındı!",
    "en": "Müraciətiniz Qeydə Alındı!",
    "ru": "Müraciətiniz Qeydə Alındı!"
  },
  {
    "key": "t_auto_a544ad87",
    "az": "Təşəkkür edirik. İnsan Resursları komandamız müraciətinizi nəzərdən keçirəcək və sizinlə əlaqə saxlayacaq.",
    "en": "Təşəkkür edirik. İnsan Resursları komandamız müraciətinizi nəzərdən keçirəcək və sizinlə əlaqə saxlayacaq.",
    "ru": "Təşəkkür edirik. İnsan Resursları komandamız müraciətinizi nəzərdən keçirəcək və sizinlə əlaqə saxlayacaq."
  },
  {
    "key": "t_auto_f7cbb325",
    "az": "Məxfilik və Şərtlər",
    "en": "Məxfilik və Şərtlər",
    "ru": "Məxfilik və Şərtlər"
  },
  {
    "key": "t_auto_93eebdd9",
    "az": "Brandfull olaraq istifadəçilərimizin və tərəfdaşlarımızın fərdi məlumatlarının qorunmasına ən yüksək səviyyədə diqqət yetiririk.",
    "en": "Brandfull olaraq istifadəçilərimizin və tərəfdaşlarımızın fərdi məlumatlarının qorunmasına ən yüksək səviyyədə diqqət yetiririk.",
    "ru": "Brandfull olaraq istifadəçilərimizin və tərəfdaşlarımızın fərdi məlumatlarının qorunmasına ən yüksək səviyyədə diqqət yetiririk."
  },
  {
    "key": "t_auto_d7731e83",
    "az": "Müəllif hüquqları və rəqəmsal aktivlər Brandfull şirkətinə məxsusdur.",
    "en": "Müəllif hüquqları və rəqəmsal aktivlər Brandfull şirkətinə məxsusdur.",
    "ru": "Müəllif hüquqları və rəqəmsal aktivlər Brandfull şirkətinə məxsusdur."
  },
  {
    "key": "t_auto_b520cffd",
    "az": "Bizimlə Danışın",
    "en": "Bizimlə Danışın",
    "ru": "Bizimlə Danışın"
  },
  {
    "key": "t_auto_c42b504c",
    "az": "Növbəti layihəniz barədə bizə məlumat verin.",
    "en": "Növbəti layihəniz barədə bizə məlumat verin.",
    "ru": "Növbəti layihəniz barədə bizə məlumat verin."
  },
  {
    "key": "t_auto_dd77e186",
    "az": "İstər süni intellekt əsaslı məhsul innovasiyası, istər tam brend transformasiyası, istərsə də kompozisiya e-ticarətinin genişləndirilməsi olsun — biz hazırıq.",
    "en": "İstər süni intellekt əsaslı məhsul innovasiyası, istər tam brend transformasiyası, istərsə də kompozisiya e-ticarətinin genişləndirilməsi olsun — biz hazırıq.",
    "ru": "İstər süni intellekt əsaslı məhsul innovasiyası, istər tam brend transformasiyası, istərsə də kompozisiya e-ticarətinin genişləndirilməsi olsun — biz hazırıq."
  },
  {
    "key": "t_auto_c691c40d",
    "az": "AD VƏ SOYAD *",
    "en": "AD VƏ SOYAD *",
    "ru": "AD VƏ SOYAD *"
  },
  {
    "key": "t_auto_21259485",
    "az": "İŞ E-POÇTU *",
    "en": "İŞ E-POÇTU *",
    "ru": "İŞ E-POÇTU *"
  },
  {
    "key": "t_auto_b9da34dd",
    "az": "XİDMƏT SAHƏSİ",
    "en": "XİDMƏT SAHƏSİ",
    "ru": "XİDMƏT SAHƏSİ"
  },
  {
    "key": "t_auto_b75234b8",
    "az": "Süni İntellekt və Platformalar",
    "en": "Süni İntellekt və Platformalar",
    "ru": "Süni İntellekt və Platformalar"
  },
  {
    "key": "t_auto_1f5af9bf",
    "az": "Brend Strategiyası və Dizayn",
    "en": "Brend Strategiyası və Dizayn",
    "ru": "Brend Strategiyası və Dizayn"
  },
  {
    "key": "t_auto_3ab795bd",
    "az": "Marketinq və Kontent",
    "en": "Marketinq və Kontent",
    "ru": "Marketinq və Kontent"
  },
  {
    "key": "t_auto_ec60e165",
    "az": "Kompozisiya E-ticarəti",
    "en": "Kompozisiya E-ticarəti",
    "ru": "Kompozisiya E-ticarəti"
  },
  {
    "key": "t_auto_afed42c5",
    "az": "Müştəri Təcrübəsi (CX)",
    "en": "Müştəri Təcrübəsi (CX)",
    "ru": "Müştəri Təcrübəsi (CX)"
  },
  {
    "key": "t_auto_aa24d033",
    "az": "Köməkçi",
    "en": "Köməkçi",
    "ru": "Köməkçi"
  },
  {
    "key": "t_auto_27c800b8",
    "az": "Brandfull Assistant",
    "en": "Brandfull Assistant",
    "ru": "Brandfull Assistant"
  },
  {
    "key": "t_auto_a4b6c33f",
    "az": "Süni İntellekt Köməkçisi",
    "en": "Süni İntellekt Köməkçisi",
    "ru": "Süni İntellekt Köməkçisi"
  },
  {
    "key": "t_auto_480589df",
    "az": "Salam. Mən Brandfull Assistantəm. Xidmətlərimiz, layihələrimiz və əməkdaşlıq imkanlarımız haqqında suallarınızı cavablandıra bilərəm.",
    "en": "Salam. Mən Brandfull Assistantəm. Xidmətlərimiz, layihələrimiz və əməkdaşlıq imkanlarımız haqqında suallarınızı cavablandıra bilərəm.",
    "ru": "Salam. Mən Brandfull Assistantəm. Xidmətlərimiz, layihələrimiz və əməkdaşlıq imkanlarımız haqqında suallarınızı cavablandıra bilərəm."
  }
];
  
  for (const item of data) {
    await prisma.translation.upsert({
      where: { key: item.key },
      update: { az: item.az, en: item.en, ru: item.ru },
      create: item
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
