new Vue({
    el: '#app',
    data: {
        scannerAtivo: false,
        codigoLido: null,
        produto: null,
        carregando: false,
        erro: null
    },
    methods: {
        iniciarScanner() {
            this.scannerAtivo = true;
            this.codigoLido = null;
            this.produto = null;
            this.erro = null;
            
            // Inicializar QuaggaJS
            Quagga.init({
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: document.querySelector('#interactive'),
                    constraints: {
                        width: 640,
                        height: 480,
                        facingMode: "environment" // Usa a câmera traseira
                    }
                },
                decoder: {
                    readers: [
                        "code_128_reader",
                        "ean_reader",
                        "ean_8_reader",
                        "code_39_reader",
                        "upc_reader",
                        "upc_e_reader"
                    ]
                }
            }, (err) => {
                if (err) {
                    this.erro = 'Erro ao inicializar scanner: ' + err;
                    console.error(err);
                    return;
                }
                
                Quagga.start();
                
                // Detectar código de barras
                Quagga.onDetected((data) => {
                    if (data.codeResult && data.codeResult.code) {
                        this.codigoLido = data.codeResult.code;
                        this.buscarProduto(this.codigoLido);
                        Quagga.stop();
                        this.scannerAtivo = false;
                    }
                });
            });
        },
        
        pararScanner() {
            if (Quagga) {
                Quagga.stop();
            }
            this.scannerAtivo = false;
        },

        async buscarProduto(codigo) {
            this.carregando = true;
            this.produto = null;
            this.erro = null;
            
            try {
                // Carrega o arquivo JSON local
                const response = await fetch('produtos.json');
                const data = await response.json();
                
                // Busca o produto no JSON
                const produtoEncontrado = data.produtos.find(
                    produto => produto.codigo_barras === codigo
                );
                
                if (produtoEncontrado) {
                    this.produto = produtoEncontrado;
                } else {
                    // Tenta API externa se não encontrar localmente
                    await this.buscarNaAPIExterna(codigo);
                }
            } catch (error) {
                this.erro = 'Erro ao buscar produto: ' + error.message;
            } finally {
                this.carregando = false;
            }
        },

        async buscarNaAPIExterna(codigo) {
            try {
                const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${codigo}.json`);
                const data = await response.json();
                
                if (data.status === 1) {
                    const product = data.product;
                    this.produto = {
                        codigo_barras: codigo,
                        nome: product.product_name || 'Produto não identificado',
                        marca: product.brands || 'Marca não informada',
                        categoria: product.categories || 'Categoria não informada',
                        preco: 'Consultar',
                        fonte: 'open_food_facts'
                    };
                } else {
                    this.erro = 'Produto não encontrado na base local nem externa';
                }
            } catch (error) {
                this.erro = 'Produto não encontrado e erro ao consultar API externa';
            }
        },
        
        async buscarProduto1(codigo) {
            this.carregando = true;
            this.produto = null;
            this.erro = null;
            
            try {
                const response = await fetch('api/processar_codigo.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ codigo_barras: codigo })
                });
                
                const data = await response.json();
                
                if (data.success && data.produto) {
                    this.produto = data.produto;
                } else {
                    this.erro = data.message || 'Produto não encontrado';
                }
            } catch (error) {
                this.erro = 'Erro ao buscar produto: ' + error.message;
            } finally {
                this.carregando = false;
            }
        },
        
        // Método alternativo para dispositivos móveis
        capturarImagem() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'camera'; // Para mobile
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                this.processarImagem(file);
            };
            
            input.click();
        },
        
        processarImagem(file) {
            // Implementação para processar imagem estática
            // Pode usar Quagga.decodeSingle para processar a imagem
        }
    },
    
    beforeDestroy() {
        this.pararScanner();
    }
});