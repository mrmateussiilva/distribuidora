import { useEffect } from "react";
import { useDashboardStore } from "../state/dashboardStore";
import { useProductsStore } from "../state/productsStore";
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { stats, loading, fetchStats } = useDashboardStore();
  const { fetchProducts } = useProductsStore();

  useEffect(() => {
    fetchStats();
    fetchProducts();
  }, [fetchStats, fetchProducts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-muted-foreground">Nenhum dado disponível</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do seu negócio
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Vendas Hoje
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.sales_today.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Vendas do Mês
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.sales_month.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.active_customers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Estoque Crítico
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.critical_stock.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estoque Crítico */}
      {stats.critical_stock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Estoque Crítico</CardTitle>
            <CardDescription>
              Produtos com estoque baixo que precisam de atenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Estoque Cheio</TableHead>
                  <TableHead>Estoque Vazio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.critical_stock.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {product.stock_full}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.stock_empty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Produtos Mais Vendidos */}
      {stats.top_products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
            <CardDescription>
              Top produtos dos últimos 30 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.top_products.map((product) => (
                  <TableRow key={product.product_id}>
                    <TableCell className="font-medium">
                      {product.product_name}
                    </TableCell>
                    <TableCell>{product.total_quantity}</TableCell>
                    <TableCell className="text-right font-semibold">
                      R$ {product.total_revenue.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

