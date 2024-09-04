
Stworzenie aplikacji mobilnej na iOS i Android użyciem technologii webowej
Aplikacja ma wyświetlać zawartość strony internetowej ze wskazanego adresu URL. Założeniem jest
możliwość edycji treści statycznych bezpośrednio na stronie web, nie w aplikacji.
Strona web aplikacji ma mieć łączność ze zdalnym serwerem REST API.

Informacje ogólne:
- wersje językowe do wyboru w aplikacji, tłumaczenia bez udziału API,
- głębokie ukrycie lub zaciemnienie adresu URL strony web i endpointów API wewnątrz aplikacji i strony web,

Elementy strony internetowej z użyciem API:
- logowanie użytkownika (adres e-mail i hasło)
- utworzenie konta użytkownika (nazwa własna użytkownika, imię, nazwisko, adres e-mail, telefon, lokalizacja)
- procedura resetu hasła (tylko zmiana hasła, wiadomość z potwierdzeniem wysyłana na adres e-mail)
- profil i edycja danych użytkownika,
- lista urządzeń użytkownika (nazwa urządzenia, kod, podstawowe statusy)
- dodawanie i usuwanie urządzenia z listy użytkownika,
- udostępnianie urządzenia z listy dla innego użytkownika,
- zmiana parametrów urządzenia.

Aplikacja ma mieć dostęp do:
- aparatu telefonu (skanowanie kodu QR urządzenia),
- lokalizacja telefonu (sprawdzenie położenia użytkownika względem urządzenia).

Poglądowa lista endpointów API

User module:
POST: /user/insert
GET: /user/data/{uid}
PUT: /user/update/{uid}
POST: /user/assign/{uid}/{device_key}
DELETE: /user/remove/{uid}/{device_key}

Authorization module:
POST: /auth/token
DELETE: /auth/token
DELETE: /auth/token/{token}

Device module:
POST: /device/list
GET: /device/data/{device_key}
GET: /device/data/{device_key}/param
GET: /device/status/{device_key}
PUT: /device/update/{device_key}
PUT: /device/update/{device_key}/param/{param_id}/{param_value}