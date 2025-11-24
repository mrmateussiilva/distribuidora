import { useEffect, useState, useRef, useCallback } from "react";
import { useProductsStore } from "../state/productsStore";
import { useCustomersStore } from "../state/customersStore";
import { useCartStore } from "../state/cartStore";
import { ordersApi } from "../api/orders";
import { receiptsApi } from "../api/receipts";
import type { Customer, Product, OrderWithCustomer, OrderWithItems } from "../types";
import {
  CheckCircle2, Trash2, Plus, Search, Copy,
  RotateCcw, TrendingUp, Package, DollarSign, AlertTriangle,
  Filter, History, Eye, FileText, ShoppingCart
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const { getItemPrice } = useCartStore();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [rows, setRows] = useState<ReceiptRow[]>([
    { id: 1, product: null, quantity: 1, unitPrice: 0, returnedBottle: false },
  ]);
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null);
  const [nextRowId, setNextRowId] = useState(2);
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [lastOrderTotal, setLastOrderTotal] = useState<number | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderWithCustomer[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const productSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    loadRecentOrders();
  }, [fetchProducts, fetchCustomers]);

  const loadRecentOrders = async () => {
    setLoadingOrders(true);
    try {
      const orders = await ordersApi.getAll();
      // Pega as últimas vendas, ordenadas por data (mais recentes primeiro)
      const sorted = orders.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRecentOrders(sorted);
    } catch (error) {
      console.error("Erro ao carregar últimas vendas:", error);
      setRecentOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

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
      await loadRecentOrders();
      setShowNewSaleModal(false);
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
        if (showNewSaleModal) {
          productSearchRef.current?.focus();
        }
        return;
      }
      // Escape para cancelar edição
      if (e.key === "Escape") {
        setEditingCell(null);
        return;
      }
      // Ctrl+Enter para finalizar venda
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && showNewSaleModal) {
        e.preventDefault();
        const currentRows = rows;
        const validRows = currentRows.filter((r) => r.product && r.quantity > 0);
        const lowStockRows = validRows.filter((r) =>
          r.product && r.quantity > r.product.stock_full
        );
        if (validRows.length > 0 && lowStockRows.length === 0) {
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
            await loadRecentOrders();
            setShowNewSaleModal(false);
          } catch (error) {
            alert("Erro ao finalizar pedido: " + error);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rows, selectedCustomer, getItemPrice, clearAll, fetchProducts, showNewSaleModal]);

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

  const filteredOrders = recentOrders.filter((order) => {
    if (!orderSearch.trim()) return true;
    const searchLower = orderSearch.toLowerCase();
    return (
      order.id.toString().includes(searchLower) ||
      (order.customer_name?.toLowerCase().includes(searchLower) ?? false) ||
      order.total.toString().includes(searchLower)
    );
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
    field: string
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

  const handleViewOrder = async (orderId: number) => {
    try {
      const order = await ordersApi.getById(orderId);
      setSelectedOrder(order);
      setShowOrderModal(true);
    } catch (error) {
      alert("Erro ao carregar detalhes da venda: " + error);
    }
  };

  const handleGenerateReceipt = async (orderId: number) => {
    try {
      const html = await receiptsApi.generate(orderId);
      // Abre em nova janela para impressão
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
    } catch (error) {
      alert("Erro ao gerar recibo: " + error);
    }
  };

  const handleNewSale = () => {
    clearAll();
    setShowNewSaleModal(true);
  };

  const lowStockProducts = getLowStockProducts();

  return (
    <div className="h-full flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendas</h1>
          <p className="text-muted-foreground">
            Gerencie suas vendas e notas fiscais
          </p>
        </div>
      </div>

      {/* Barra de pesquisa e botão Nova Venda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar notas por ID, cliente ou valor..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={handleNewSale} className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Nova Venda
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Últimas Vendas */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5" />
              <CardTitle>Últimas Vendas</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadRecentOrders}
              title="Atualizar"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          {loadingOrders ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">
                {orderSearch ? "Nenhuma venda encontrada" : "Nenhuma venda registrada"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right w-[100px]">Total</TableHead>
                    <TableHead className="w-[150px]">Data</TableHead>
                    <TableHead className="w-[120px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-accent/50">
                      <TableCell className="font-medium">#{order.id}</TableCell>
                      <TableCell>
                        {order.customer_name ? (
                          <span className="text-sm">{order.customer_name}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">
                            Consumidor Final
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-green-600">
                          R$ {order.total.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewOrder(order.id)}
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleGenerateReceipt(order.id)}
                            title="Gerar recibo"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Nova Venda */}
      <Dialog open={showNewSaleModal} onOpenChange={setShowNewSaleModal}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Nova Venda</DialogTitle>
            <DialogDescription>
              Adicione produtos e finalize a venda
            </DialogDescription>
          </DialogHeader>

          {/* Mensagem de sucesso */}
          {orderSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Venda finalizada com sucesso!</p>
                {lastOrderTotal && (
                  <p className="text-sm text-green-700">
                    Total: R$ {lastOrderTotal.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
            {/* Coluna Esquerda - Produtos e Carrinho */}
            <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
              {/* Busca de Produtos */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        ref={productSearchRef}
                        placeholder="Buscar produto (Ctrl+K)..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={productFilter} onValueChange={setProductFilter}>
                      <SelectTrigger className="w-[180px]">
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
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Produtos */}
              <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader>
                  <CardTitle>Produtos</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredProducts.map((product) => (
                      <Button
                        key={product.id}
                        variant="outline"
                        className="h-auto flex flex-col items-start p-3 hover:bg-accent"
                        onClick={() => handleQuickAddProduct(product)}
                      >
                        <div className="w-full">
                          <p className="font-semibold text-left">{product.name}</p>
                          <p className="text-xs text-muted-foreground text-left mt-1">
                            {product.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-bold">
                              R$ {product.price_full.toFixed(2)}
                            </span>
                            <Badge variant={product.stock_full > 0 ? "default" : "destructive"}>
                              Est: {product.stock_full}
                            </Badge>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Carrinho/Recibo */}
              <Card className="flex-1 overflow-hidden flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recibo</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAll}
                        title="Limpar tudo"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto flex flex-col">
                  {/* Seleção de Cliente */}
                  <div className="mb-4">
                    <Label>Cliente</Label>
                    <Select
                      value={selectedCustomer?.id.toString() || "none"}
                      onValueChange={(value) => {
                        if (value === "none") {
                          setSelectedCustomer(null);
                        } else {
                          const customer = customers.find((c) => c.id === parseInt(value));
                          setSelectedCustomer(customer || null);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente (opcional)" />
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

                  {/* Tabela de Itens */}
                  <div className="flex-1 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Preço</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              {row.product ? (
                                <div>
                                  <p className="font-medium">{row.product.name}</p>
                                  {row.returnedBottle && (
                                    <Badge variant="secondary" className="text-xs mt-1">
                                      com casco
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <Select
                                  value=""
                                  onValueChange={(value) => handleProductChange(row.id, value)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem
                                        key={product.id}
                                        value={product.id.toString()}
                                      >
                                        {product.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingCell?.rowId === row.id && editingCell.field === "quantity" ? (
                                <Input
                                  ref={inputRef}
                                  type="number"
                                  min="1"
                                  defaultValue={row.quantity}
                                  onBlur={(e) =>
                                    handleCellEdit(row.id, "quantity", e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleKeyDown(e, row.id, "quantity")
                                  }
                                  className="w-20"
                                />
                              ) : (
                                <div
                                  className="cursor-pointer hover:bg-accent p-1 rounded"
                                  onClick={() => setEditingCell({ rowId: row.id, field: "quantity" })}
                                >
                                  {row.quantity}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {row.product && (
                                <div>
                                  {editingCell?.rowId === row.id && editingCell.field === "price" ? (
                                    <Input
                                      ref={inputRef}
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      defaultValue={row.customPrice || getItemPrice({
                                        product: row.product,
                                        quantity: row.quantity,
                                        returnedBottle: row.returnedBottle,
                                      })}
                                      onBlur={(e) =>
                                        handleCellEdit(row.id, "price", e.target.value)
                                      }
                                      onKeyDown={(e) =>
                                        handleKeyDown(e, row.id, "price")
                                      }
                                      className="w-24"
                                    />
                                  ) : (
                                    <div
                                      className="cursor-pointer hover:bg-accent p-1 rounded"
                                      onClick={() => setEditingCell({ rowId: row.id, field: "price" })}
                                    >
                                      R$ {(row.customPrice !== undefined
                                        ? row.customPrice
                                        : getItemPrice({
                                            product: row.product,
                                            quantity: row.quantity,
                                            returnedBottle: row.returnedBottle,
                                          })
                                      ).toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {row.product ? `R$ ${calculateRowTotal(row).toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {row.product && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => duplicateRow(row.id)}
                                    title="Duplicar"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                )}
                                {rows.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeRow(row.id)}
                                    title="Remover"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {rows.length === 1 && !rows[0].product && (
                      <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={addNewRow}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Item
                      </Button>
                    )}
                  </div>

                  {/* Total e Botão de Finalizar */}
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total:</span>
                      <span>R$ {getTotalAmount().toFixed(2)}</span>
                    </div>
                    {lowStockProducts.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-amber-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Alguns produtos têm estoque baixo</span>
                      </div>
                    )}
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleCheckout}
                      disabled={rows.filter((r) => r.product).length === 0}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Finalizar Venda (Ctrl+Enter)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita - Estatísticas */}
            <div className="flex flex-col gap-4 overflow-hidden">
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Itens:</span>
                    </div>
                    <span className="font-semibold">{getTotalQuantity()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Total:</span>
                    </div>
                    <span className="font-semibold">R$ {getTotalAmount().toFixed(2)}</span>
                  </div>
                  {getTotalQuantity() > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Média:</span>
                      </div>
                      <span className="font-semibold">R$ {getAveragePrice().toFixed(2)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes da Venda */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Venda #{selectedOrder?.order.id}
            </DialogTitle>
            <DialogDescription>
              Detalhes completos da venda
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <p>
                  <span className="font-semibold">Cliente:</span>{" "}
                  {selectedOrder.order.customer_name || (
                    <span className="text-muted-foreground">Consumidor Final</span>
                  )}
                </p>
                <p>
                  <span className="font-semibold">Data:</span>{" "}
                  {new Date(selectedOrder.order.created_at).toLocaleString("pt-BR")}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Itens da Venda:</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Preço Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.product_name}{" "}
                          {item.returned_bottle && (
                            <Badge variant="secondary" className="ml-2">
                              com casco
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>R$ {item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          R$ {(item.quantity * item.unit_price).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="text-right border-t pt-4">
                <p className="text-xl font-bold">
                  Total: R$ {selectedOrder.order.total.toFixed(2)}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowOrderModal(false)}
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => handleGenerateReceipt(selectedOrder.order.id)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar Recibo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
