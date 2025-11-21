# Ícones do Aplicativo

O Tauri requer ícones em vários tamanhos. Para desenvolvimento, você pode usar ícones placeholder.

## Gerar Ícones

Você pode usar ferramentas online como:
- https://www.icoconverter.com/
- https://convertio.co/png-ico/

Ou usar o ImageMagick se tiver instalado:

```bash
# Criar um ícone simples (substitua icon.png pelo seu ícone)
convert icon.png -resize 32x32 src-tauri/icons/32x32.png
convert icon.png -resize 128x128 src-tauri/icons/128x128.png
convert icon.png -resize 128x128 src-tauri/icons/128x128@2x.png
convert icon.png -resize 256x256 src-tauri/icons/256x256.png
convert icon.png -resize 256x256 src-tauri/icons/256x256@2x.png
convert icon.png -resize 512x512 src-tauri/icons/512x512.png
convert icon.png -resize 512x512 src-tauri/icons/512x512@2x.png
```

## Tamanhos Necessários

- 32x32.png
- 128x128.png
- 128x128@2x.png (256x256)
- 256x256.png
- 256x256@2x.png (512x512)
- 512x512.png
- 512x512@2x.png (1024x1024)

Para desenvolvimento, você pode criar ícones simples coloridos ou usar um gerador de ícones placeholder.

