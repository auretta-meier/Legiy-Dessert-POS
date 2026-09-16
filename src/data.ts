export type Category = string;

export interface ProductAddonOption {
  id?: string;
  name: string;
  price: number;
}

export interface ProductAddonGroup {
  id?: string;
  name?: string;
  groupName?: string;
  type: 'single' | 'multiple';
  required?: boolean;
  options: ProductAddonOption[];
}

export interface SelectedAddon {
  groupName: string;
  optionName: string;
  name?: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cogs: number;
  category: Category;
  imageColor: string; // Used for a placeholder color
  addons?: ProductAddonGroup[];
}

export const DEFAULT_BEVERAGE_ADDONS: ProductAddonGroup[] = [
  {
    groupName: 'Tingkat Gula (Sugar Level)',
    type: 'single',
    required: true,
    options: [
      { name: 'Normal Sugar (100%)', price: 0 },
      { name: 'Less Sugar (50%)', price: 0 },
      { name: 'Slight Sugar (25%)', price: 0 },
      { name: 'No Sugar (0%)', price: 0 },
      { name: 'Extra Sweet (120%)', price: 0 },
    ],
  },
  {
    groupName: 'Tingkat Es (Ice Level)',
    type: 'single',
    required: true,
    options: [
      { name: 'Normal Ice', price: 0 },
      { name: 'Less Ice', price: 0 },
      { name: 'No Ice', price: 0 },
      { name: 'Extra Ice', price: 0 },
      { name: 'Hot (Panas)', price: 0 },
    ],
  },
  {
    groupName: 'Extra Topping & Syrup',
    type: 'multiple',
    options: [
      { name: 'Extra Espresso Shot', price: 8000 },
      { name: 'Ganti Oat Milk', price: 10000 },
      { name: 'Vanilla Syrup', price: 5000 },
      { name: 'Caramel Syrup', price: 5000 },
      { name: 'Grass Jelly / Boba', price: 5000 },
    ],
  },
];

export const DEFAULT_DESSERT_ADDONS: ProductAddonGroup[] = [
  {
    groupName: 'Suhu Penyajian',
    type: 'single',
    required: true,
    options: [
      { name: 'Dingin Segar (Chilled)', price: 0 },
      { name: 'Suhu Ruang (Normal)', price: 0 },
      { name: 'Dihangatkan (Warm)', price: 0 },
    ],
  },
  {
    groupName: 'Tambahan & Topping Spesial',
    type: 'multiple',
    options: [
      { name: 'Extra Cheese Cream Dip', price: 7000 },
      { name: 'Extra Choco Flakes', price: 5000 },
      { name: '1 Scoop Vanilla Ice Cream', price: 12000 },
      { name: 'Lilin Ulang Tahun + Greeting', price: 4000 },
      { name: 'Gift Box & Pita Legiy', price: 8000 },
    ],
  },
];

export const initialCategories: string[] = ['Signature Dessert', 'Kopi', 'Non-Kopi', 'Add-ons'];

export const products: Product[] = [
  // Signature Dessert
  { id: 'd1', name: 'Original Tiramisu', price: 35000, cogs: 15000, category: 'Signature Dessert', imageColor: 'bg-amber-100 text-amber-800' },
  { id: 'd2', name: 'Matcha Tiramisu', price: 40000, cogs: 18000, category: 'Signature Dessert', imageColor: 'bg-green-100 text-green-800' },
  { id: 'd3', name: 'Strawberry Cheesecake', price: 42000, cogs: 20000, category: 'Signature Dessert', imageColor: 'bg-rose-100 text-rose-800' },
  { id: 'd4', name: 'Choco Lava Cake', price: 38000, cogs: 16000, category: 'Signature Dessert', imageColor: 'bg-brown-100 text-amber-900 border border-amber-200' },
  
  // Kopi
  { id: 'k1', name: 'Espresso', price: 18000, cogs: 5000, category: 'Kopi', imageColor: 'bg-stone-200 text-stone-800' },
  { id: 'k2', name: 'Americano', price: 22000, cogs: 6000, category: 'Kopi', imageColor: 'bg-stone-200 text-stone-800' },
  { id: 'k3', name: 'Cafe Latte', price: 28000, cogs: 10000, category: 'Kopi', imageColor: 'bg-orange-100 text-orange-800' },
  { id: 'k4', name: 'Cappuccino', price: 28000, cogs: 10000, category: 'Kopi', imageColor: 'bg-orange-100 text-orange-800' },
  { id: 'k5', name: 'Vanilla/Caramel Latte', price: 32000, cogs: 12000, category: 'Kopi', imageColor: 'bg-amber-100 text-amber-800' },
  { id: 'k6', name: 'Legiy Signature Aren', price: 25000, cogs: 9000, category: 'Kopi', imageColor: 'bg-orange-200 text-orange-900' },
  
  // Non-Kopi
  { id: 'nk1', name: 'Matcha Latte', price: 30000, cogs: 12000, category: 'Non-Kopi', imageColor: 'bg-green-100 text-green-800' },
  { id: 'nk2', name: 'Classic Chocolate', price: 28000, cogs: 11000, category: 'Non-Kopi', imageColor: 'bg-amber-800 text-amber-100' },
  { id: 'nk3', name: 'Lychee Tea', price: 25000, cogs: 8000, category: 'Non-Kopi', imageColor: 'bg-rose-100 text-rose-800' },
  { id: 'nk4', name: 'Peach Tea', price: 25000, cogs: 8000, category: 'Non-Kopi', imageColor: 'bg-orange-100 text-orange-800' },
  { id: 'nk5', name: 'Mineral Water', price: 10000, cogs: 4000, category: 'Non-Kopi', imageColor: 'bg-blue-100 text-blue-800' },

  // Add-ons
  { id: 'a1', name: 'Extra Shot Espresso', price: 8000, cogs: 3000, category: 'Add-ons', imageColor: 'bg-stone-200 text-stone-800' },
  { id: 'a2', name: 'Oat Milk Switch', price: 10000, cogs: 6000, category: 'Add-ons', imageColor: 'bg-amber-50 text-amber-800' },
  { id: 'a3', name: 'Vanilla/Caramel Syrup', price: 5000, cogs: 2000, category: 'Add-ons', imageColor: 'bg-yellow-100 text-yellow-800' },
  { id: 'a4', name: 'Ice Cream Scoop', price: 12000, cogs: 5000, category: 'Add-ons', imageColor: 'bg-pink-100 text-pink-800' },
];

export const formatRupiah = (number: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};
