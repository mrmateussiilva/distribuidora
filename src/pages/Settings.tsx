import { useState } from "react";
import { Save } from "lucide-react";

export default function Settings() {
  const [settings, setSettings] = useState({
    companyName: "Distribuidora",
    address: "",
    phone: "",
    email: "",
  });

  const handleSave = () => {
    // Aqui você pode salvar as configurações (localStorage ou banco)
    localStorage.setItem("settings", JSON.stringify(settings));
    alert("Configurações salvas com sucesso!");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Configurações</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Dados da Empresa</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nome da Empresa
            </label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) =>
                setSettings({ ...settings, companyName: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Endereço</label>
            <textarea
              value={settings.address}
              onChange={(e) =>
                setSettings({ ...settings, address: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefone</label>
            <input
              type="text"
              value={settings.phone}
              onChange={(e) =>
                setSettings({ ...settings, phone: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) =>
                setSettings({ ...settings, email: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <Save className="w-5 h-5" />
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

