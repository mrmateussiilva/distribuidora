import { useEffect, useState } from "react";
import { useProductsStore } from "../state/productsStore";
import { productsApi } from "../api/products";
import type { Product, CreateProductPayload } from "../types";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Products() {
  const { products, loading, fetchProducts, removeProduct } =
    useProductsStore();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<CreateProductPayload>({
    name: "",
    description: "",
    type: "water",
    price_refill: 0,
    price_full: 0,
    stock_full: 0,
    stock_empty: 0,
  });

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, formData);
        await fetchProducts();
      } else {
        await productsApi.create(formData);
        await fetchProducts();
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        type: "water",
        price_refill: 0,
        price_full: 0,
        stock_full: 0,
        stock_empty: 0,
      });
    } catch (error) {
      alert("Erro ao salvar produto: " + error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      type: product.type,
      price_refill: product.price_refill,
      price_full: product.price_full,
      stock_full: product.stock_full,
      stock_empty: product.stock_empty,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
      try {
        await productsApi.delete(id);
        removeProduct(id);
      } catch (error) {
        alert("Erro ao excluir produto: " + error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      water: "Água",
      gas: "Gás",
      coal: "Carvão",
      other: "Outro",
    };
    return labels[type] || type;
  };

  const getTypeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    if (type === "water") return "default";
    if (type === "gas") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie seus produtos e estoque
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingProduct(null);
            setFormData({
              name: "",
              description: "",
              type: "water",
              price_refill: 0,
              price_full: 0,
              stock_full: 0,
              stock_empty: 0,
            });
            setShowModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <CardDescription>
            Todos os produtos cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Preço (com casco)</TableHead>
                <TableHead>Preço (sem casco)</TableHead>
                <TableHead>Estoque Cheio</TableHead>
                <TableHead>Estoque Vazio</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant={getTypeVariant(product.type)}>
                      {getTypeLabel(product.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>R$ {product.price_refill.toFixed(2)}</TableCell>
                  <TableCell>R$ {product.price_full.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">
                    {product.stock_full}
                  </TableCell>
                  <TableCell>{product.stock_empty}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Atualize as informações do produto"
                : "Adicione um novo produto ao sistema"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    type: value as any,
                  })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="water">Água</SelectItem>
                  <SelectItem value="gas">Gás</SelectItem>
                  <SelectItem value="coal">Carvão</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_refill">Preço (com casco)</Label>
                <Input
                  id="price_refill"
                  type="number"
                  step="0.01"
                  required
                  value={formData.price_refill}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_refill: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_full">Preço (sem casco)</Label>
                <Input
                  id="price_full"
                  type="number"
                  step="0.01"
                  required
                  value={formData.price_full}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_full: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock_full">Estoque Cheio</Label>
                <Input
                  id="stock_full"
                  type="number"
                  value={formData.stock_full}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock_full: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_empty">Estoque Vazio</Label>
                <Input
                  id="stock_empty"
                  type="number"
                  value={formData.stock_empty}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock_empty: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setEditingProduct(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

