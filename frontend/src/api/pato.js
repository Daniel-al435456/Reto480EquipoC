/*
 * Sprites del pato tutor en pixel art (32 × 32).
 * Cada variante (pato con gafas, pata con lazo) tiene una imagen base ("cerrado": pico cerrado, ojos abiertos)
 * y el resto de caras se guardan como diferencias respecto a ella: grupos de 3 caracteres
 * (columna, fila, color), con columna y fila en base 32 (0-9, a-v).
 * No editar a mano: se genera con frontend/herramientas/pato.py.
 */

export const PALETA_PATO = {"R": "#ff4950", "r": "#c82d37", "K": "#1f2222", "Y": "#ffd03a", "L": "#ffe88c", "S": "#e8a814", "D": "#c4800a", "O": "#ff8c3c", "Q": "#d6601e", "o": "#6e2414", "W": "#ffffff", "C": "#1cf9fc", "c": "#008c91", "G": "#dcfafa", "P": "#ff9682"};

export const SPRITES_PATO = {
 "pato": {
  "base": [
   "................KK..............",
   "...............KYYK.............",
   "............KKKYKKKK............",
   "..........KKLLLLLYYYKK..........",
   ".........KLLLLLYYYYYYYK.........",
   "........KLLLLLYYYYYYYYYK........",
   ".......KLLLLYYYYYYYYYYYYK.......",
   ".......KLLYYYYYYYYYYYYYYK.......",
   "......KLCCCCCCYYYYCCCCCCYK......",
   "......KcCYWKGCCCCCCYWKGCcK......",
   "......KYCYKKYCYYYYCYKKYCYK......",
   "......KYCYKKYCYYYYCYKKYCYK......",
   "......KYCCCCCCYYYYCCCCCCSK......",
   "......KYYYYYKKKKKKKKYYSSSK......",
   "......KYYYYKOLLOOOOOKYSSSK......",
   ".......KYYKQQQQQQQQQQKSSK.......",
   ".......KYYYKOOOOOOOOKYSSK.......",
   "........KYYYKKKKKKKKYYSK........",
   ".........KYYYYYYYYYYYYK.........",
   ".........KKKYYYYYYYYKKK.........",
   ".......KKYYYKKKKKKKKYYYKK.......",
   "......KDYYYYYYYYYYYYYYYYDK......",
   ".....KDYDDYYYYYYYYYYYYDDYDK.....",
   "....KYYYYYDYYYYYYYYYYDYYYYYK....",
   "....KYYYYYDYYYYYYYYYYDYYYYYK....",
   "....KYYYYYDYYYYYYYYYYDYYYYYK....",
   "....KYYYYYDYYYYYYYYYYDYYYYYK....",
   ".....KSSSSDYYYYYYYYYSDSSSSK.....",
   "......KSSSDYYYYYYSSSSDSSSK......",
   ".......KKDYYYYSSSSSSSSDKK.......",
   ".........KKKKSSSSSSKKKK.........",
   ".............KKKKKK............."
  ],
  "abierto": "bfocfodfoefoffogfohfoifojfokfocgodgoegPfgPggPhgPigojgobhKchOdhOehOfhOghOhhOihOjhOkhKciKdiKeiKfiKgiKhiKiiKjiK",
  "parpadeo": "a9Yb9Yk9Yl9Y9aKaaYbaYcaKjaKkaYlaYmaK",
  "mirar": "99Wa9Kb9Yj9Wk9Kl9Y9aKbaYjaKlaY9bKbbYjbKlbY",
  "cola": "a9Yb9Yk9Yl9Y9aWbaYjaWlaY9bKbbYjbKlbY9cKacKjcKkcK",
  "pensando": "a9Yb9Wc9Kk9Yl9Wm9KaaYcaKkaYmaKabYbbYkbYlbY8eD9eD6gK7gY5hK6hY7hY8hY6iK7iY8iY9iYbiD7jK8jY9jY9kD",
  "saludando": "qeKreKseKpfKqfYrfYsfYtfKpgKqgYrgYsgYtgKohKphYqhYrhYshYthYuhKoiKpiYqiYriYsiYtiYuiKojKpjYqjYrjYsjYtjYujKpkYqkYrkYskYtkYukKqlYrlYslYtlKqmYrmYsmYtmKsnK",
  "contento": "a9Yb9Yk9Yl9Y9bKabYbbYcbKjbKkbYlbYmbKbfocfodfoefoffogfohfoifojfokfocgodgoegPfgPggPhgPigojgobhKchOdhOehOfhOghOhhOihOjhOkhKciKdiKeiKfiKgiKhiKiiKjiK",
  "contento_c": "a9Yb9Yk9Yl9Y9bKabYbbYcbKjbKkbYlbYmbK",
  "animando": "k9Yl9YjaKmaKkbYlbYqeKreKseKbfocfodfoefoffogfohfoifojfokfopfKqfYrfYsfYtfKcgodgoegPfgPggPhgPigojgopgKqgYrgYsgYtgKbhKchOdhOehOfhOghOhhOihOjhOkhKohKphYqhYrhYshYthYuhKciKdiKeiKfiKgiKhiKiiKjiKoiKpiYqiYriYsiYtiYuiKojKpjYqjYrjYsjYtjYujKpkYqkYrkYskYtkYukKqlYrlYslYtlKqmYrmYsmYtmKsnK",
  "animando_c": "k9Yl9YjaKmaKkbYlbYqeKreKseKpfKqfYrfYsfYtfKpgKqgYrgYsgYtgKohKphYqhYrhYshYthYuhKoiKpiYqiYriYsiYtiYuiKojKpjYqjYrjYsjYtjYujKpkYqkYrkYskYtkYukKqlYrlYslYtlKqmYrmYsmYtmKsnK"
 },
 "pata": {
  "base": [
   "................KK..............",
   "...............KYYK.............",
   "............KKKYKKKKK..KK.......",
   "..........KKLLLLLYKRRKKRRK......",
   ".........KLLLLLYYYKRRrrRRK......",
   "........KLLLLLYYYYKRrrrrRK......",
   ".......KLLLLYYYYYYYKKKKKK.......",
   ".......KLLYYYYYYYYYYYYYYK.......",
   "......KLLYYYYYYYYYYYYYYYYK......",
   "......KYYYWKYYYYYYYYWKYYYK......",
   "......KYYYKKYYYYYYYYKKYYYK......",
   "......KYYYKKYYYYYYYYKKYYYK......",
   "......KYYYYYYYYYYYYYYYYSSK......",
   "......KYYYYYKKKKKKKKYYSSSK......",
   "......KYYYYKOLLOOOOOKYSSSK......",
   ".......KYYKQQQQQQQQQQKSSK.......",
   ".......KYYYKOOOOOOOOKYSSK.......",
   "........KYYYKKKKKKKKYYSK........",
   ".........KYYYYYYYYYYYYK.........",
   ".........KKKYYYYYYYYKKK.........",
   ".......KKYYYKKKKKKKKYYYKK.......",
   "......KDYYYYYYYYYYYYYYYYDK......",
   ".....KDYDDYYYYYYYYYYYYDDYDK.....",
   "....KYYYYYDYYYYYYYYYYDYYYYYK....",
   "....KYYYYYDYYYYYYYYYYDYYYYYK....",
   "....KYYYYYDYYYYYYYYYYDYYYYYK....",
   "....KYYYYYDYYYYYYYYYYDYYYYYK....",
   ".....KSSSSDYYYYYYYYYSDSSSSK.....",
   "......KSSSDYYYYYYSSSSDSSSK......",
   ".......KKDYYYYSSSSSSSSDKK.......",
   ".........KKKKSSSSSSKKKK.........",
   ".............KKKKKK............."
  ],
  "abierto": "bfocfodfoefoffogfohfoifojfokfocgodgoegPfgPggPhgPigojgobhKchOdhOehOfhOghOhhOihOjhOkhKciKdiKeiKfiKgiKhiKiiKjiK",
  "parpadeo": "a9Yb9Yk9Yl9Y9aKaaYbaYcaKjaKkaYlaYmaK",
  "mirar": "99Wa9Kb9Yj9Wk9Kl9Y9aKbaYjaKlaY9bKbbYjbKlbY",
  "cola": "a9Yb9Yk9Yl9Y9aWbaYjaWlaY9bKbbYjbKlbY9cKacKjcKkcK",
  "pensando": "a9Yb9Wc9Kk9Yl9Wm9KaaYcaKkaYmaKabYbbYkbYlbY8eD9eD6gK7gY5hK6hY7hY8hY6iK7iY8iY9iYbiD7jK8jY9jY9kD",
  "saludando": "qeKreKseKpfKqfYrfYsfYtfKpgKqgYrgYsgYtgKohKphYqhYrhYshYthYuhKoiKpiYqiYriYsiYtiYuiKojKpjYqjYrjYsjYtjYujKpkYqkYrkYskYtkYukKqlYrlYslYtlKqmYrmYsmYtmKsnK",
  "contento": "a9Yb9Yk9Yl9Y9bKabYbbYcbKjbKkbYlbYmbKbfocfodfoefoffogfohfoifojfokfocgodgoegPfgPggPhgPigojgobhKchOdhOehOfhOghOhhOihOjhOkhKciKdiKeiKfiKgiKhiKiiKjiK",
  "contento_c": "a9Yb9Yk9Yl9Y9bKabYbbYcbKjbKkbYlbYmbK",
  "animando": "k9Yl9YjaKmaKkbYlbYqeKreKseKbfocfodfoefoffogfohfoifojfokfopfKqfYrfYsfYtfKcgodgoegPfgPggPhgPigojgopgKqgYrgYsgYtgKbhKchOdhOehOfhOghOhhOihOjhOkhKohKphYqhYrhYshYthYuhKciKdiKeiKfiKgiKhiKiiKjiKoiKpiYqiYriYsiYtiYuiKojKpjYqjYrjYsjYtjYujKpkYqkYrkYskYtkYukKqlYrlYslYtlKqmYrmYsmYtmKsnK",
  "animando_c": "k9Yl9YjaKmaKkbYlbYqeKreKseKpfKqfYrfYsfYtfKpgKqgYrgYsgYtgKohKphYqhYrhYshYthYuhKoiKpiYqiYriYsiYtiYuiKojKpjYqjYrjYsjYtjYujKpkYqkYrkYskYtkYukKqlYrlYslYtlKqmYrmYsmYtmKsnK"
 }
};
