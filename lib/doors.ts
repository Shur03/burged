export const categories = ["Смарт цоожтой", "Орон сууцны", "Гадна хаалга"] as const;
export type Category = (typeof categories)[number];

export type Door = {
  id: string;
  title: string;
  category: Category;
  description: string;
  price: number;
  pickupPrice: number | null;
  size: string;
  opening: string;
  specifications: string[];
  benefits: string[];
  delivery: string;
  promotion: string;
  phone: string;
  secondPhone?: string;
  address: string;
  image: string;
  images?: string[];
  illustrative?: boolean;
  sample?: boolean;
};

export const maxDoorPhotos = 8;
export const maxDoorPhotoBytes = 4 * 1024 * 1024;

export function doorPhotos(door: Pick<Door, "image" | "images">) {
  return door.images ?? (door.image ? [door.image] : []);
}

export const shop = {
  phone: "99651919",
  secondPhone: "88181894",
  address: "100 айл, 9-р дэлгүүрийн автобусны буудал орчим",
};

export const currency = (amount: number) => `${new Intl.NumberFormat("en-US").format(amount).replaceAll(",", " ")} ₮`;
export const phoneLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
export const phoneLabel = (phone: string) => phone.replace(/^(\d{4})(\d{4})$/, "$1 $2");

export const initialDoors: Door[] = [
  {
    id: "smart-steel",
    title: "Смарт цоожтой ган хаалга",
    category: "Смарт цоожтой",
    description: "Өвлийн дулаалгатай, камертай смарт цоож бүхий ган хаалга.",
    price: 1100000,
    pickupPrice: 990000,
    size: "96 × 205 см, 86 × 205 см",
    opening: "Баруун, зүүн",
    specifications: [
      "2.2 мм зузаан ган лист",
      "Өвлийн дулаалгын давхар жийрэг",
      "Даацын нугас",
      "Гал дэмжихгүй шахмал хөөсөн дулаалга",
      "11 см зузаан самбар",
      "Гандаж, хувирахаас хамгаалсан авто будаг",
    ],
    benefits: [
      "Камер, код, чип, ослын түлхүүртэй смарт цоож",
      "Батарейн хяналт, ослын дохиолол",
      "Дуу чимээ, хүйтэн, үнэр болон утаа тусгаарлана",
      "Даацын нугас нь хаалга унжихаас хамгаална",
      "Давхар хаалга хийх шаардлагагүй",
    ],
    delivery: "Хөдөө орон нутаг руу явуулна.",
    promotion: "",
    phone: shop.phone,
    secondPhone: shop.secondPhone,
    address: shop.address,
    image: "/doors/smart.webp",
    illustrative: true,
  },
  {
    id: "oak-apartment",
    title: "Царсан өнгөлгөөтэй хаалга",
    category: "Орон сууцны",
    description: "Дулаан модон өнгө, цэвэрхэн хийц бүхий орон сууцны хаалга.",
    price: 850000,
    pickupPrice: null,
    size: "86 × 205 см",
    opening: "Баруун, зүүн",
    specifications: ["Царсан өнгөлгөө", "Хар бариул"],
    benefits: [],
    delivery: "",
    promotion: "",
    phone: "",
    address: "",
    image: "/doors/oak.webp",
    illustrative: true,
    sample: true,
  },
  {
    id: "graphite-outdoor",
    title: "Дулаалгатай гадна хаалга",
    category: "Гадна хаалга",
    description: "Хар саарал өнгөтэй, геометрийн хээтэй гадна хаалга.",
    price: 1250000,
    pickupPrice: null,
    size: "96 × 205 см",
    opening: "Баруун, зүүн",
    specifications: ["Ган хийц", "Дулаалгатай самбар"],
    benefits: [],
    delivery: "",
    promotion: "",
    phone: "",
    address: "",
    image: "/doors/outdoor.webp",
    illustrative: true,
    sample: true,
  },
];
