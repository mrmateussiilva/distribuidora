import { useEffect, useState } from "react";
import { ordersApi } from "../api/orders";
import { receiptsApi } from "../api/receipts";
import type { OrderWithCustomer, OrderWithItems } from "../types";
import { FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Orders() {
  const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(
    null
  );
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await ordersApi.getAll();
      setOrders(data);
    } catch (error) {
      alert("Erro ao carregar vendas: " + error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (orderId: number) => {
    try {
      const order = await ordersApi.getById(orderId);
      setSelectedOrder(order);
      setShowOrderModal(true);
    } catch (error) {
      alert("Erro ao carregar pedido: " + error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Histórico de Vendas</h1>
        <p className="text-muted-foreground">
          Visualize todas as vendas realizadas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Vendas</CardTitle>
          <CardDescription>
            Todas as vendas registradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.id}</TableCell>
                  <TableCell>
                    {order.customer_name || (
                      <span className="text-muted-foreground">Consumidor Final</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(order.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    R$ {order.total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewOrder(order.id)}
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
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
        </CardContent>
      </Card>

      {/* Dialog de Detalhes do Pedido */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Pedido #{selectedOrder?.order.id}
            </DialogTitle>
            <DialogDescription>
              Detalhes completos do pedido
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
                  {new Date(selectedOrder.order.created_at).toLocaleString(
                    "pt-BR"
                  )}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Itens:</h3>
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

              <div className="flex justify-end">
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

