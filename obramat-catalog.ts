export interface ObramatProduct {
  id: string;
  nameEs: string;
  nameRu: string;
  category: string;
  defaultUnit: string;
  approxPrice: number;
}

export const OBRAMAT_CATEGORIES = [
  "Материалы и Смеси (Materiales y Morteros)",
  "Электрика (Electricidad)",
  "Сантехника и Отопление (Fontanería y Calefacción)",
  "Инструменты и Крепеж (Herramientas и Fijaciones)",
  "Изоляция и Плитка (Aislamiento y Cerámica)"
];

export const OBRAMAT_PRODUCTS: ObramatProduct[] = [
  // Morteros y Cemento
  {
    id: "obr-1",
    nameEs: "Cemento gris Portland CEM II/B-L 32,5 R saco 25 kg",
    nameRu: "Цемент серый Портланд CEM II 32.5 saco 25 кг",
    category: "Материалы и Смеси (Materiales y Morteros)",
    defaultUnit: "1 saco (25 кг)",
    approxPrice: 3.45
  },
  {
    id: "obr-2",
    nameEs: "Mortero seco de cemento gris M-7,5 saco 25 kg",
    nameRu: "Сухой цементный раствор M-7.5 saco 25 кг",
    category: "Материалы и Смеси (Materiales y Morteros)",
    defaultUnit: "1 saco (25 кг)",
    approxPrice: 1.95
  },
  {
    id: "obr-3",
    nameEs: "Yeso controlado de construcción saco 17 kg",
    nameRu: "Гипс строительный saco 17 кг",
    category: "Материалы и Смеси (Materiales y Morteros)",
    defaultUnit: "1 saco (17 кг)",
    approxPrice: 2.80
  },
  {
    id: "obr-4",
    nameEs: "Placa de yeso laminado (PLADUR) Standard BA 13 x 1200 x 2500 mm",
    nameRu: "Гипсокартон PLADUR Стандарт BA 13 (1.2 х 2.5 м)",
    category: "Материалы и Смеси (Materiales y Morteros)",
    defaultUnit: "1 placa (3 м²)",
    approxPrice: 9.80
  },
  {
    id: "obr-5",
    nameEs: "Arena de río lavada saco 20 kg",
    nameRu: "Песок речной мытый saco 20 кг",
    category: "Материалы и Смеси (Materiales y Morteros)",
    defaultUnit: "1 saco (20 кг)",
    approxPrice: 1.50
  },
  {
    id: "obr-6",
    nameEs: "Ladrillo hueco doble 24 x 11.5 x 7 cm",
    nameRu: "Кирпич пустотелый двойной 24х11.5х7 см",
    category: "Материалы и Смеси (Materiales y Morteros)",
    defaultUnit: "100 шт",
    approxPrice: 0.28
  },

  // Acero y Metal
  {
    id: "obr-7",
    nameEs: "Varilla corrugada de acero B500S Ø 12 mm x 6 m",
    nameRu: "Арматура стальная рифленая B500S Ø 12 мм х 6 м",
    category: "Материалы и Смеси (Materiales y Morteros)",
    defaultUnit: "10 шт",
    approxPrice: 6.85
  },
  {
    id: "obr-8",
    nameEs: "Mallazo electrosoldado de acero Ø 4 mm de 2.20 x 1.20 m (cuadrícula 15x15)",
    nameRu: "Сетка арматурная сварная Ø 4 мм (2.2 х 1.2 м)",
    category: "Материалы и Смеси (Materiales y Morteros)",
    defaultUnit: "1 шт",
    approxPrice: 5.40
  },

  // Electricidad
  {
    id: "obr-9",
    nameEs: "Cable unipolar H07V-U 1,5 mm² azul de cobre rígido rollo 100 m",
    nameRu: "Кабель медный одножильный H07V-U 1.5 мм² синий 100 м",
    category: "Электрика (Electricidad)",
    defaultUnit: "1 rollo (100 м)",
    approxPrice: 18.20
  },
  {
    id: "obr-10",
    nameEs: "Cable unipolar H07V-U 2,5 mm² marrón de cobre rígido rollo 100 m",
    nameRu: "Кабель медный одножильный H07V-U 2.5 мм² коричневый 100 м",
    category: "Электрика (Electricidad)",
    defaultUnit: "1 rollo (100 м)",
    approxPrice: 28.50
  },
  {
    id: "obr-11",
    nameEs: "Tubo corrugado PVC con guía Ø 20 mm rollo 100 m",
    nameRu: "Труба гофрированная ПВХ с протяжкой Ø 20 мм 100 м",
    category: "Электрика (Electricidad)",
    defaultUnit: "1 rollo (100 м)",
    approxPrice: 14.50
  },
  {
    id: "obr-12",
    nameEs: "Caja de derivación empotrar 100x100 mm",
    nameRu: "Коробка распаячная встраиваемая 100х100 мм",
    category: "Электрика (Electricidad)",
    defaultUnit: "5 шт",
    approxPrice: 0.65
  },
  {
    id: "obr-13",
    nameEs: "Mecanismo interruptor Simón 27 Play blanco",
    nameRu: "Выключатель одноклавишный Simon 27 Play белый",
    category: "Электрика (Electricidad)",
    defaultUnit: "1 шт",
    approxPrice: 4.80
  },
  {
    id: "obr-14",
    nameEs: "Base enchufe schuko Simón 27 Play blanco con seguridad",
    nameRu: "Розетка с заземлением Simon 27 Play белая",
    category: "Электрика (Electricidad)",
    defaultUnit: "1 шт",
    approxPrice: 5.20
  },

  // Fontaneria
  {
    id: "obr-15",
    nameEs: "Tubo de cobre en barra Ø 15 mm x 3 m",
    nameRu: "Труба медная в штанге Ø 15 мм х 3 м",
    category: "Сантехника и Отопление (Fontanería y Calefacción)",
    defaultUnit: "1 шт",
    approxPrice: 11.20
  },
  {
    id: "obr-16",
    nameEs: "Tubo de PVC evacuación Ø 110 mm x 3 m con junta labiada",
    nameRu: "Труба ПВХ канализационная Ø 110 мм х 3 м",
    category: "Сантехника и Отопление (Fontanería y Calefacción)",
    defaultUnit: "1 шт",
    approxPrice: 9.30
  },
  {
    id: "obr-17",
    nameEs: "Codo de PVC evacuación 45° Ø 110 mm hembra-macho",
    nameRu: "Отвод ПВХ 45 градусов Ø 110 мм х-м",
    category: "Сантехника и Отопление (Fontanería y Calefacción)",
    defaultUnit: "2 шт",
    approxPrice: 2.15
  },
  {
    id: "obr-18",
    nameEs: "Tubo multicapa Ø 20 mm aislado rollo 50 m",
    nameRu: "Труба металлопластиковая Ø 20 мм изолированная 50 м",
    category: "Сантехника и Отопление (Fontanería y Calefacción)",
    defaultUnit: "1 rollo (50 м)",
    approxPrice: 58.00
  },
  {
    id: "obr-19",
    nameEs: "Teflón profesional rollo de 12 mm x 12 m",
    nameRu: "Лента ФУМ профессиональная 12 мм х 12 м",
    category: "Сантехника и Отопление (Fontanería y Calefacción)",
    defaultUnit: "1 шт",
    approxPrice: 0.95
  },

  // Herramientas y Fijaciones
  {
    id: "obr-20",
    nameEs: "Cinta métrica profesional autobloqueo de 5 m x 25 mm",
    nameRu: "Рулетка измерительная профессиональная 5 м х 25 мм",
    category: "Инструменты и Крепеж (Herramientas и Fijaciones)",
    defaultUnit: "1 шт",
    approxPrice: 6.50
  },
  {
    id: "obr-21",
    nameEs: "Caja de tornillos para placa de yeso laminado (pladur) 3.5 x 25 mm 1000 ud",
    nameRu: "Саморезы для гипсокартона 3.5х25 мм коробка 1000 шт",
    category: "Инструменты и Крепеж (Herramientas и Fijaciones)",
    defaultUnit: "1 caja (1000 шт)",
    approxPrice: 12.40
  },
  {
    id: "obr-22",
    nameEs: "Tacos de nylon tipo Fischer SX Ø 6 mm con tornillo caja 100 ud",
    nameRu: "Дюбель-гвозди нейлоновые Fischer SX Ø 6 мм коробка 100 шт",
    category: "Инструменты и Крепеж (Herramientas и Fijaciones)",
    defaultUnit: "1 caja (100 шт)",
    approxPrice: 8.90
  },
  {
    id: "obr-23",
    nameEs: "Pistola aplicadora de silicona profesional reforzada",
    nameRu: "Пистолет для силикона и герметика усиленный",
    category: "Инструменты и Крепеж (Herramientas и Fijaciones)",
    defaultUnit: "1 шт",
    approxPrice: 14.20
  },
  {
    id: "obr-24",
    nameEs: "Adhesivo de montaje de agarre inmediato No Mas Clavos cartucho 365g",
    nameRu: "Монтажный клей жидкие гвозди Pattex No Mas Clavos 365г",
    category: "Инструменты и Крепеж (Herramientas и Fijaciones)",
    defaultUnit: "1 ud (365 г)",
    approxPrice: 5.95
  },

  // Aislamiento
  {
    id: "obr-25",
    nameEs: "Panel lana de roca acústica de 40 mm (paquete 9.6 m²)",
    nameRu: "Минеральная вата Каменная рокакустик 40 мм (9.6 м²)",
    category: "Изоляция и Плитка (Aislamiento y Cerámica)",
    defaultUnit: "1 paq (9.6 м²)",
    approxPrice: 32.50
  },
  {
    id: "obr-26",
    nameEs: "Espuma poliuretano expansiva cánula manual de 750 ml",
    nameRu: "Пена монтажная полиуретановая под трубку 750 мл",
    category: "Изоляция и Плитка (Aislamiento y Cerámica)",
    defaultUnit: "1 bote (750 мл)",
    approxPrice: 5.80
  }
];
