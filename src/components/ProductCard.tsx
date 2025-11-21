import { Flame, Droplet, Package } from "lucide-react";
import type { Product } from "../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onAddToCart: () => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const getIcon = () => {
    switch (product.type) {
      case "gas":
        return <Flame className="w-8 h-8 text-orange-500" />;
      case "water":
        return <Droplet className="w-8 h-8 text-blue-500" />;
      default:
        return <Package className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const isOutOfStock = product.stock_full <= 0;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg",
        isOutOfStock && "opacity-50 cursor-not-allowed"
      )}
      onClick={!isOutOfStock ? onAddToCart : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-center mb-2">
          {getIcon()}
        </div>
        <CardTitle className="text-lg">{product.name}</CardTitle>
        {product.description && (
          <CardDescription className="text-xs">
            {product.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Com casco: </span>
            <span className="font-semibold">{formatCurrency(product.price_full)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Sem casco: </span>
            <span className="font-semibold">{formatCurrency(product.price_refill)}</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <Badge variant={isOutOfStock ? "destructive" : "secondary"}>
            Estoque: {product.stock_full}
          </Badge>
          {isOutOfStock && (
            <Badge variant="destructive">Sem estoque</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

