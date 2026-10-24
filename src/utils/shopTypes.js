// What kind of shop a branch is (gss core.models.SHOP_TYPE_CHOICES). Picked at sign-up for the first
// branch and again for every branch added later, so one business can run a gadget shop and a
// restaurant side by side. The server decides what each type turns on (core.modules.TYPE_MODULES);
// `hint` only tells the owner what to expect.
export const SHOP_TYPES = [
  { value: 'gadgets', label: 'Gadgets & electronics (phones, laptops, accessories)', short: 'Gadgets & electronics',
    hint: 'Stock, sales and reports, with service tickets for repairs.' },
  { value: 'clothing', label: 'Clothing & fashion', short: 'Clothing & fashion',
    hint: 'Stock, sales and reports.' },
  { value: 'pharmacy', label: 'Pharmacy & health products', short: 'Pharmacy',
    hint: 'Stock with drug categories and prescription flags, sales and reports.' },
  { value: 'restaurant', label: 'Restaurant & food (restaurant, café, bar, fast food)', short: 'Restaurant & food',
    hint: 'Menu, tables, kitchen tickets and bills on the hub till, plus stock for drinks and ingredients.' },
  { value: 'general', label: 'General retail / other', short: 'General retail',
    hint: 'Stock, sales and reports.' },
];

export function shopType(value) {
  return SHOP_TYPES.find((t) => t.value === value) || SHOP_TYPES[SHOP_TYPES.length - 1];
}
