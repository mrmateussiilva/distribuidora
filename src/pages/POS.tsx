import { useEffect, useState, useRef, useCallback } from "react";
import { useProductsStore } from "../state/productsStore";
import { useCustomersStore } from "../state/customersStore";
import { useCartStore } from "../state/cartStore";
import { ordersApi } from "../api/orders";
import type { Customer, Product } from "../types";
import { 
  CheckCircle2, Trash2, Plus, Search, X, Keyboard, Copy, 
  RotateCcw, TrendingUp, Package, DollarSign, AlertTriangle,
  ChevronDown, ChevronUp, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ReceiptRow {
  id: number;
  product: Product | null;
  quantity: number;
  unitPrice: number;
  customPrice?: number;
  returnedBottle: boolean;
}

export default function POS() {
  const { products, fetchProducts } = useProductsStore();
  const { customers, fetchCustomers } = useCustomersStore();
  const { getItemPrice, getTotal, clear } = useCartStore();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [rows, setRows] = useState<ReceiptRow[]>([
    { id: 1, product: null, quantity: 1, unitPrice: 0, returnedBottle: false },
  ]);
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null);
  const [nextRowId, setNextRowId] = useState(2);
  const [productSearch, setProductSearch] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [productFilter, setProductFilter] = useState<string>("all");
  const [showStats, setShowStats] = useState(true);
  const [lastOrderTotal, setLastOrderTotal] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, [fetchProducts, fetchCustomers]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  const calculateRowTotal = (row: ReceiptRow) => {
    if (!row.product) return 0;
    const price = row.customPrice !== undefined ? row.customPrice : getItemPrice({
      product: row.product,
      quantity: row.quantity,
      returnedBottle: row.returnedBottle,
    });
    return price * row.quantity;
  };

  const clearAll = useCallback(() => {
    setRows([
      { id: 1, product: null, quantity: 1, unitPrice: 0, returnedBottle: false },
    ]);
    setNextRowId(2);
    setSelectedCustomer(null);
    setProductSearch("");
  }, []);

  const handleCheckout = useCallback(async () => {
    const validRows = rows.filter((row) => row.product !== null && row.quantity > 0);
    
    if (validRows.length === 0) {
      alert("Adicione pelo menos um produto à venda");
      return;
    }

    // Valida estoque
    const lowStockRows = validRows.filter((row) => 
      row.product && row.quantity > row.product.stock_full
    );
    if (lowStockRows.length > 0) {
      const productNames = lowStockRows.map((r) => r.product!.name).join(", ");
      alert(`Estoque insuficiente para: ${productNames}`);
      return;
    }

    try {
      const orderItems = validRows.map((row) => {
        const price = row.customPrice !== undefined 
          ? row.customPrice 
          : getItemPrice({
              product: row.product!,
              quantity: row.quantity,
              returnedBottle: row.returnedBottle,
            });
        
        return {
          product_id: row.product!.id,
          quantity: row.quantity,
          returned_bottle: row.returnedBottle,
          unit_price: price,
        };
      });

      await ordersApi.create({
        customer_id: selectedCustomer?.id || null,
        items: orderItems,
      });

      const total = rows.reduce((total, row) => total + calculateRowTotal(row), 0);
      setLastOrderTotal(total);
      clearAll();
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
      await fetchProducts();
    } catch (error) {
      alert("Erro ao finalizar pedido: " + error);
    }
  }, [rows, selectedCustomer, getItemPrice, clearAll, fetchProducts]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl/Cmd + K para buscar produto
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        productSearchRef.current?.focus();
        return;
      }
      // F1 para mostrar atalhos
      if (e.key === "F1") {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }
      // Escape para cancelar edição
      if (e.key === "Escape") {
        setEditingCell(null);
        return;
      }
      // Ctrl+Enter para finalizar venda
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const currentRows = rows;
        const validRows = currentRows.filter((r) => r.product && r.quantity > 0);
        const lowStockRows = validRows.filter((r) => 
          r.product && r.quantity > r.product.stock_full
        );
        if (validRows.length > 0 && lowStockRows.length === 0) {
          // Executa checkout diretamente aqui para evitar dependência circular
          try {
            const orderItems = validRows.map((row) => {
              const price = row.customPrice !== undefined 
                ? row.customPrice 
                : getItemPrice({
                    product: row.product!,
                    quantity: row.quantity,
                    returnedBottle: row.returnedBottle,
                  });
              
              return {
                product_id: row.product!.id,
                quantity: row.quantity,
                returned_bottle: row.returnedBottle,
                unit_price: price,
              };
            });

            await ordersApi.create({
              customer_id: selectedCustomer?.id || null,
              items: orderItems,
            });

            const total = currentRows.reduce((total, row) => total + calculateRowTotal(row), 0);
            setLastOrderTotal(total);
            clearAll();
            setOrderSuccess(true);
            setTimeout(() => setOrderSuccess(false), 3000);
            await fetchProducts();
          } catch (error) {
            alert("Erro ao finalizar pedido: " + error);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rows, selectedCustomer, getItemPrice, clearAll, fetchProducts]);

  const getTotalAmount = () => {
    return rows.reduce((total, row) => total + calculateRowTotal(row), 0);
  };

  const getTotalQuantity = () => {
    return rows.reduce((total, row) => total + (row.product ? row.quantity : 0), 0);
  };

  const getAveragePrice = () => {
    const validRows = rows.filter((r) => r.product);
    if (validRows.length === 0) return 0;
    return getTotalAmount() / getTotalQuantity();
  };

  const getLowStockProducts = () => {
    return rows.filter((r) => r.product && r.product.stock_full < r.quantity);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = productSearch.trim() === "" ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.description?.toLowerCase().includes(productSearch.toLowerCase()) ?? false);
    const matchesFilter = productFilter === "all" || p.type === productFilter;
    return matchesSearch && matchesFilter;
  });

  const handleProductChange = (rowId: number, productId: string) => {
    const product = products.find((p) => p.id === parseInt(productId));
    if (product) {
      setRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                product,
                unitPrice: product.price_full,
                customPrice: undefined,
                quantity: row.quantity || 1,
              }
            : row
        )
      );
      setTimeout(() => {
        setEditingCell({ rowId, field: "quantity" });
      }, 100);
    }
  };

  const handleQuickAddProduct = (product: Product) => {
    const emptyRow = rows.find((row) => !row.product);
    if (emptyRow) {
      handleProductChange(emptyRow.id, product.id.toString());
    } else {
      const newRow: ReceiptRow = {
        id: nextRowId,
        product,
        quantity: 1,
        unitPrice: product.price_full,
        returnedBottle: false,
      };
      setRows((prev) => [...prev, newRow]);
      setNextRowId((prev) => prev + 1);
      setTimeout(() => {
        setEditingCell({ rowId: newRow.id, field: "quantity" });
      }, 100);
    }
    setProductSearch("");
  };

  const duplicateRow = (rowId: number) => {
    const row = rows.find((r) => r.id === rowId);
    if (row && row.product) {
      const newRow: ReceiptRow = {
        id: nextRowId,
        product: row.product,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        customPrice: row.customPrice,
        returnedBottle: row.returnedBottle,
      };
      setRows((prev) => {
        const index = prev.findIndex((r) => r.id === rowId);
        return [...prev.slice(0, index + 1), newRow, ...prev.slice(index + 1)];
      });
      setNextRowId((prev) => prev + 1);
    }
  };

  const handleCellEdit = (rowId: number, field: string, value: string | number | boolean) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        
        if (field === "quantity") {
          const qty = Number(value) || 1;
          // Valida estoque
          if (row.product && qty > row.product.stock_full) {
            alert(`Estoque insuficiente! Disponível: ${row.product.stock_full}`);
            return { ...row, quantity: Math.min(qty, row.product.stock_full) };
          }
          return { ...row, quantity: qty };
        } else if (field === "price") {
          const price = value === "" ? undefined : Number(value);
          return { ...row, customPrice: price };
        } else if (field === "returnedBottle") {
          return { ...row, returnedBottle: value as boolean };
        }
        return row;
      })
    );
    setEditingCell(null);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    rowId: number,
    field: string,
    currentValue: string | number
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      handleCellEdit(rowId, field, target.value);
      
      if (field === "quantity") {
        setEditingCell({ rowId, field: "price" });
      } else if (field === "price") {
        const currentIndex = rows.findIndex((r) => r.id === rowId);
        if (currentIndex < rows.length - 1) {
          const nextRow = rows[currentIndex + 1];
          if (nextRow.product) {
            setEditingCell({ rowId: nextRow.id, field: "quantity" });
          }
        } else {
          addNewRow();
        }
      }
    } else if (e.key === "Escape") {
      setEditingCell(null);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      handleCellEdit(rowId, field, target.value);
    } else if (e.key === "ArrowDown" && field === "quantity") {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      handleCellEdit(rowId, field, target.value);
      const currentIndex = rows.findIndex((r) => r.id === rowId);
      if (currentIndex < rows.length - 1) {
        setEditingCell({ rowId: rows[currentIndex + 1].id, field: "quantity" });
      }
    } else if (e.key === "ArrowUp" && field === "quantity") {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      handleCellEdit(rowId, field, target.value);
      const currentIndex = rows.findIndex((r) => r.id === rowId);
      if (currentIndex > 0) {
        setEditingCell({ rowId: rows[currentIndex - 1].id, field: "quantity" });
      }
    }
  };

  const addNewRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: nextRowId,
        product: null,
        quantity: 1,
        unitPrice: 0,
        returnedBottle: false,
      },
    ]);
    setNextRowId((prev) => prev + 1);
  };

  const removeRow = (rowId: number) => {
    if (rows.length > 1) {
      setRows((prev) => prev.filter((row) => row.id !== rowId));
    }
  };

  const lowStockProducts = getLowStockProducts();

  return (
    <div className="h-full flex flex-col bg-background p-6 overflow-auto">
      {/* Barra Superior com Busca e Filtros */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={productSearchRef}
              placeholder="Buscar produto (Ctrl+K)..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredProducts.length > 0) {
                  handleQuickAddProduct(filteredProducts[0]);
                }
              }}
              className="pl-10"
            />
            {productSearch && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                onClick={() => setProductSearch("")}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
            {productSearch && filteredProducts.length > 0 && (
              <div className="absolute z-50 mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto w-full">
                {filteredProducts.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="p-2 hover:bg-accent cursor-pointer flex justify-between items-center border-b last:border-b-0"
                    onClick={() => handleQuickAddProduct(product)}
                  >
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        R$ {product.price_full.toFixed(2)} • Estoque: {product.stock_full}
                      </div>
                    </div>
                    <Badge variant={product.stock_full <= 0 ? "destructive" : "secondary"}>
                      {product.stock_full <= 0 ? "Sem estoque" : "Disponível"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="water">Água</SelectItem>
              <SelectItem value="gas">Gás</SelectItem>
              <SelectItem value="coal">Carvão</SelectItem>
              <SelectItem value="other">Outros</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowShortcuts(!showShortcuts)}
            title="Atalhos de teclado (F1)"
          >
            <Keyboard className="w-4 h-4" />
          </Button>
        </div>

        {/* Estatísticas Rápidas */}
        {showStats && (
          <Card className="p-3">
            <div className="grid grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Itens</div>
                  <div className="font-semibold">{getTotalQuantity()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="font-semibold">R$ {getTotalAmount().toFixed(2)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Média</div>
                  <div className="font-semibold">R$ {getAveragePrice().toFixed(2)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn(
                  "w-4 h-4",
                  lowStockProducts.length > 0 ? "text-destructive" : "text-muted-foreground"
                )} />
                <div>
                  <div className="text-xs text-muted-foreground">Atenção</div>
                  <div className={cn(
                    "font-semibold",
                    lowStockProducts.length > 0 && "text-destructive"
                  )}>
                    {lowStockProducts.length} {lowStockProducts.length === 1 ? "item" : "itens"}
                  </div>
                </div>
          </div>
            </div>
          </Card>
        )}

        {/* Atalhos de Teclado */}
        {showShortcuts && (
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Atalhos de Teclado:</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div><kbd className="px-2 py-1 bg-background rounded border">Ctrl+K</kbd> - Buscar produto</div>
              <div><kbd className="px-2 py-1 bg-background rounded border">Ctrl+Enter</kbd> - Finalizar venda</div>
              <div><kbd className="px-2 py-1 bg-background rounded border">F1</kbd> - Mostrar/Ocultar atalhos</div>
              <div><kbd className="px-2 py-1 bg-background rounded border">Enter</kbd> - Confirmar edição</div>
              <div><kbd className="px-2 py-1 bg-background rounded border">Esc</kbd> - Cancelar edição</div>
              <div><kbd className="px-2 py-1 bg-background rounded border">↑↓</kbd> - Navegar entre linhas</div>
            </div>
          </Card>
        )}
        </div>

      {/* Cabeçalho do Recibo */}
      <div className="mb-4 border-b-2 border-foreground pb-3">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-5xl font-black mb-0 leading-tight">MORAIS</h1>
            <p className="text-xl italic text-muted-foreground -mt-1">distribuidora</p>
            <div className="mt-3 space-y-0.5 text-xs">
              <p className="font-medium">Morais Distribuidora de água mineral</p>
              <p>Av. Tailândia – nº 127, Bairro Columbia - Colatina - ES</p>
              <p>(27) 99893-2758 / (27) 99938-1129</p>
              <p>moraisdistribuidora@gmail.com</p>
            </div>
          </div>
          <div className="text-right space-y-3">
            <p className="text-sm font-semibold">Nota de controle N°.: 0002</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold w-16 text-right">CLIENTE:</span>
                <Select
                  value={selectedCustomer?.id?.toString() || "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setSelectedCustomer(null);
                    } else {
                      const customer = customers.find((c) => c.id === parseInt(value));
                setSelectedCustomer(customer || null);
                    }
                  }}
                >
                  <SelectTrigger className="w-[220px] h-8">
                    <SelectValue placeholder="Consumidor Final" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Consumidor Final</SelectItem>
              {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                  {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold w-16 text-right">DATA:</span>
                <Input
                  type="text"
                  value={getCurrentDate()}
                  readOnly
                  className="w-[220px] h-8 bg-background"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Estoque Baixo */}
      {lowStockProducts.length > 0 && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <div className="flex-1">
            <div className="font-semibold text-destructive">Atenção: Estoque Insuficiente</div>
            <div className="text-sm text-muted-foreground">
              {lowStockProducts.map((r) => 
                `${r.product!.name} (solicitado: ${r.quantity}, disponível: ${r.product!.stock_full})`
              ).join(", ")}
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Produtos */}
      <div className="border-2 border-foreground bg-white rounded-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-foreground p-2 text-left font-semibold bg-muted">Produto</th>
              <th className="border border-foreground p-2 text-left font-semibold w-32 bg-muted">Tipo/Peso</th>
              <th className="border border-foreground p-2 text-center font-semibold w-20 bg-muted">Quant.</th>
              <th className="border border-foreground p-2 text-right font-semibold w-28 bg-muted">Valor Unit.</th>
              <th className="border border-foreground p-2 text-right font-semibold w-28 bg-muted">Valor Total</th>
              <th className="border border-foreground p-2 text-center font-semibold w-16 bg-muted">Casco</th>
              <th className="border border-foreground p-2 text-center font-semibold w-20 bg-muted">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isEditing = editingCell?.rowId === row.id;
              const unitPrice = row.customPrice !== undefined
                ? row.customPrice
                : row.product
                ? getItemPrice({
                    product: row.product,
                    quantity: row.quantity,
                    returnedBottle: row.returnedBottle,
                  })
                : 0;
              const total = calculateRowTotal(row);
              const isOutOfStock = row.product ? row.product.stock_full <= 0 : false;
              const isLowStock = row.product ? row.quantity > row.product.stock_full : false;

              return (
                <tr 
                  key={row.id} 
                  className={cn(
                    "hover:bg-muted/20 transition-colors",
                    isOutOfStock && "bg-destructive/10",
                    isLowStock && "bg-yellow-50",
                    !row.product && "bg-muted/10"
                  )}
                >
                  <td className="border border-foreground p-2">
                    {row.product ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.product.name}</span>
                        {isOutOfStock && (
                          <Badge variant="destructive" className="text-xs">Sem estoque</Badge>
                        )}
                        {isLowStock && !isOutOfStock && (
                          <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                            Estoque baixo
                          </Badge>
                        )}
                    </div>
                    ) : (
                      <Select
                        value=""
                        onValueChange={(value) => handleProductChange(row.id, value)}
                      >
                        <SelectTrigger className="h-8 border-0 shadow-none bg-transparent">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products
                            .filter((p) => productFilter === "all" || p.type === productFilter)
                            .map((product) => (
                            <SelectItem 
                              key={product.id} 
                              value={product.id.toString()}
                              disabled={product.stock_full <= 0}
                            >
                              {product.name} {product.stock_full <= 0 && "(Sem estoque)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="border border-foreground p-2 text-sm text-muted-foreground">
                    {row.product?.description || (row.product?.type === "gas" ? "13kg" : row.product?.type) || ""}
                  </td>
                  <td className="border border-foreground p-2 text-center">
                    {isEditing && editingCell.field === "quantity" ? (
                      <Input
                        ref={inputRef}
                        type="number"
                        min="1"
                        max={row.product?.stock_full}
                        defaultValue={row.quantity}
                        className="w-16 h-8 text-center border-foreground"
                        onBlur={(e) => handleCellEdit(row.id, "quantity", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, row.id, "quantity", row.quantity)}
                      />
                    ) : (
                      <div
                        className={cn(
                          "cursor-pointer hover:bg-muted px-2 py-1 rounded min-w-[40px] inline-block text-center transition-colors",
                          !row.product && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => row.product && setEditingCell({ rowId: row.id, field: "quantity" })}
                      >
                        {row.quantity}
                    </div>
                    )}
                  </td>
                  <td className="border border-foreground p-2 text-right">
                    {isEditing && editingCell.field === "price" ? (
                      <Input
                        ref={inputRef}
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={row.customPrice ?? unitPrice}
                        className="w-24 h-8 text-right border-foreground"
                        onBlur={(e) => handleCellEdit(row.id, "price", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, row.id, "price", row.customPrice ?? unitPrice)}
                      />
                    ) : (
                      <div
                        className={cn(
                          "cursor-pointer hover:bg-muted px-2 py-1 rounded min-w-[80px] inline-block text-right transition-colors",
                          !row.product && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => row.product && setEditingCell({ rowId: row.id, field: "price" })}
                      >
                        {row.customPrice !== undefined && (
                          <Badge variant="outline" className="mr-1 text-xs">Custom</Badge>
                        )}
                        R$ {unitPrice.toFixed(2)}
                  </div>
                    )}
                  </td>
                  <td className="border border-foreground p-2 text-right font-semibold">
                    R$ {total.toFixed(2)}
                  </td>
                  <td className="border border-foreground p-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.returnedBottle}
                      onChange={(e) => handleCellEdit(row.id, "returnedBottle", e.target.checked)}
                      disabled={!row.product}
                      className="w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Cliente trouxe casco"
                    />
                  </td>
                  <td className="border border-foreground p-2 text-center">
                    <div className="flex justify-center gap-1">
                      {row.product && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => duplicateRow(row.id)}
                          className="h-7 w-7"
                          title="Duplicar linha"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        className="h-7 w-7"
                        disabled={rows.length === 1}
                        title="Remover linha"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50">
              <td colSpan={2} className="border border-foreground p-2 font-semibold">
                TOTAIS
              </td>
              <td className="border border-foreground p-2 text-center font-semibold">
                {getTotalQuantity()}
              </td>
              <td className="border border-foreground p-2"></td>
              <td className="border border-foreground p-2 text-right font-semibold text-lg">
                R$ {getTotalAmount().toFixed(2)}
              </td>
              <td colSpan={2} className="border border-foreground p-2"></td>
            </tr>
          </tfoot>
        </table>
          </div>

      {/* Rodapé e Ações */}
      <div className="mt-4 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={addNewRow} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Linha
            </Button>
            <Button variant="outline" onClick={clearAll} size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Limpar Tudo
            </Button>
            {orderSuccess && (
              <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg animate-in fade-in">
                <CheckCircle2 className="w-5 h-5" />
                <span>Pedido finalizado! Total: R$ {lastOrderTotal?.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCheckout}
              size="lg" 
              className="min-w-[150px]"
              disabled={rows.filter((r) => r.product).length === 0 || lowStockProducts.length > 0}
            >
              Finalizar Venda
            </Button>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground italic pt-2 border-t">
          Deus é nossa fonte!
        </div>
        <div className="text-center text-xs text-muted-foreground pt-1">
          ASSINATURA: ___________________________
        </div>
      </div>
    </div>
  );
}
