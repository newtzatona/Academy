// ======================================
// SPELLS DATABASE - OLLIVANDER'S ACADEMY
// ======================================
// عشان تضيف تعويذة جديدة:
// 1. ضيف object جديد في الـ array
// 2. الحقول المطلوبة: name, category, stance, levels
// 3. requiresScroll: true — لازم سكرول + !use قبل !train
// 4. كل level فيها: damage/healing, accuracy, mana, critChance, effect, flavorText

const spells = [

  // ===== STARTER SPELLS (6) - متاحة لكل ساحر من الأول =====

  // --- AGGRESSIVE ---
  {
    name: 'Stupefy',
    category: 'charms',
    stance: 'aggressive',
    levels: [
      { damage: 22, accuracy: 70, mana: 18, critChance: 5,  effect: null, flavorText: 'شعاع أحمر يصيب الخصم ويبطئ حركته.' },
      { damage: 28, accuracy: 74, mana: 17, critChance: 7,  effect: null, flavorText: 'يصوب بعناية... الخصم يتزعزع.' },
      { damage: 35, accuracy: 78, mana: 16, critChance: 9,  effect: null, flavorText: 'الشعاع الأحمر يصيب في مقتل.' },
      { damage: 43, accuracy: 82, mana: 15, critChance: 12, effect: null, flavorText: 'بقوة ساحر متمرس... الخصم يصعق.' },
      { damage: 52, accuracy: 86, mana: 14, critChance: 15, effect: null, flavorText: 'شعاع أحمر هائل يوقع الخصم أرضا.' },
    ],
  },
  {
    name: 'Oppugno',
    category: 'transfiguration',
    stance: 'aggressive',
    levels: [
      { damage: 18, accuracy: 68, mana: 20, critChance: 5,  effect: null, flavorText: 'جسم صغير ينقض على الخصم.' },
      { damage: 24, accuracy: 72, mana: 19, critChance: 7,  effect: null, flavorText: 'يحول ما حوله سلاحا... الخصم يتراجع.' },
      { damage: 30, accuracy: 76, mana: 18, critChance: 9,  effect: { type: 'bleed', duration: 1, value: 5 }, flavorText: 'أشياء متعددة تنقض على الخصم.' },
      { damage: 37, accuracy: 80, mana: 17, critChance: 12, effect: { type: 'bleed', duration: 1, value: 8 }, flavorText: 'بقدرة تحويلية... سرب كامل يهجم على الخصم.' },
      { damage: 45, accuracy: 84, mana: 16, critChance: 15, effect: { type: 'bleed', duration: 2, value: 8 }, flavorText: 'جيش من المخلوقات المحولة تنقض.' },
    ],
  },

  // --- SNEAKY ---
  {
    name: 'Rictusempra',
    category: 'charms',
    stance: 'sneaky',
    levels: [
      { damage: 14, accuracy: 75, mana: 14, critChance: 5,  effect: null, flavorText: 'الخصم يشعر بدغدغة خفيفة تشتت تركيزه.' },
      { damage: 18, accuracy: 79, mana: 13, critChance: 7,  effect: null, flavorText: 'بابتسامة خبيثة... الخصم يضحك رغم إرادته.' },
      { damage: 23, accuracy: 83, mana: 12, critChance: 9,  effect: null, flavorText: 'ضحكة لا تكبح تعيق الخصم.' },
      { damage: 28, accuracy: 87, mana: 11, critChance: 12, effect: null, flavorText: 'الخصم يضحك حتى الدموع.' },
      { damage: 34, accuracy: 91, mana: 10, critChance: 15, effect: null, flavorText: 'الخصم منهك من الضحك.' },
    ],
  },
  {
    name: 'Levicorpus',
    category: 'charms',
    stance: 'sneaky',
    levels: [
      { damage: 12, accuracy: 65, mana: 16, critChance: 5,  effect: null, flavorText: 'الخصم يرتفع قدما عن الأرض.' },
      { damage: 16, accuracy: 69, mana: 15, critChance: 7,  effect: null, flavorText: 'يهمس التعويذة... الخصم يجد نفسه يطفو.' },
      { damage: 20, accuracy: 73, mana: 14, critChance: 9,  effect: { type: 'stun', duration: 1 }, flavorText: 'الخصم معلق في الهواء عاجزا.' },
      { damage: 25, accuracy: 77, mana: 13, critChance: 12, effect: { type: 'stun', duration: 1 }, flavorText: 'بخفة... الخصم يتأرجح في الهواء.' },
      { damage: 30, accuracy: 81, mana: 12, critChance: 15, effect: { type: 'stun', duration: 1 }, flavorText: 'الخصم في الهواء تماما عاجز عن الحركة.' },
    ],
  },

  // --- DEFENSIVE ---
  {
    name: 'Protego',
    category: 'charms',
    stance: 'defensive',
    levels: [
      { damage: 0, healing: 10, accuracy: 80, mana: 16, critChance: 5,  effect: { type: 'shield', duration: 1, value: 12 }, flavorText: 'درع شفاف خفيف يتشكل أمام الساحر.' },
      { damage: 0, healing: 14, accuracy: 84, mana: 15, critChance: 7,  effect: { type: 'shield', duration: 1, value: 16 }, flavorText: 'يرفع العصا بثبات... الدرع يصبح أكثر صلابة.' },
      { damage: 0, healing: 18, accuracy: 88, mana: 14, critChance: 9,  effect: { type: 'shield', duration: 2, value: 18 }, flavorText: 'درع قوي يحيط الساحر.' },
      { damage: 0, healing: 23, accuracy: 91, mana: 13, critChance: 12, effect: { type: 'shield', duration: 2, value: 22 }, flavorText: 'بإتقان تام... الدرع يلمع.' },
      { damage: 0, healing: 28, accuracy: 94, mana: 12, critChance: 15, effect: { type: 'shield', duration: 2, value: 28 }, flavorText: 'درع منيع يحيط الساحر.' },
    ],
  },
  {
    name: 'Episkey',
    category: 'healing',
    stance: 'defensive',
    levels: [
      { damage: 0, healing: 16, accuracy: 85, mana: 15, critChance: 5,  effect: null, flavorText: 'إصابة بسيطة تعالج بلمسة سحرية خفيفة.' },
      { damage: 0, healing: 21, accuracy: 88, mana: 14, critChance: 7,  effect: null, flavorText: 'توجه العصا بدقة... الألم يتراجع.' },
      { damage: 0, healing: 27, accuracy: 91, mana: 13, critChance: 9,  effect: null, flavorText: 'عظام مكسورة تعود لمكانها.' },
      { damage: 0, healing: 34, accuracy: 94, mana: 12, critChance: 12, effect: null, flavorText: 'شفاء سريع ومؤثر... الجسد يعود لحالته.' },
      { damage: 0, healing: 42, accuracy: 97, mana: 11, critChance: 15, effect: null, flavorText: 'علاج فوري وكامل.' },
    ],
  },

  // ===== SCROLL SPELLS - لازم سكرول + !use =====

  {
    name: 'PetrificusTotalus',
    requiresScroll: true,
    category: 'defense',
    stance: 'sneaky',
    levels: [
      { damage: 12, accuracy: 65, mana: 22, critChance: 5,  effect: { type: 'stun', duration: 1 }, flavorText: 'الخصم يتصلب فجأة.' },
      { damage: 16, accuracy: 69, mana: 21, critChance: 7,  effect: { type: 'stun', duration: 1 }, flavorText: 'يطلق التعويذة بهدوء... جسد الخصم يتجمد.' },
      { damage: 20, accuracy: 73, mana: 20, critChance: 9,  effect: { type: 'stun', duration: 1 }, flavorText: 'الخصم يسقط كالتمثال.' },
      { damage: 25, accuracy: 77, mana: 19, critChance: 12, effect: { type: 'stun', duration: 2 }, flavorText: 'تجمد كامل... الخصم عاجز عن الحركة.' },
      { damage: 31, accuracy: 81, mana: 18, critChance: 15, effect: { type: 'stun', duration: 2 }, flavorText: 'الخصم حجر لا يتحرك ولا يتكلم.' },
    ],
  },

];

module.exports = spells;