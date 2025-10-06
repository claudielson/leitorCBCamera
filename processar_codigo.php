<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Simulação de banco de dados - em produção use MySQL, PostgreSQL, etc.
$produtos = json_decode(file_get_contents('produtos.json'), true);

// Obter dados do POST
$input = json_decode(file_get_contents('php://input'), true);
$codigo_barras = $input['codigo_barras'] ?? '';

if (empty($codigo_barras)) {
    echo json_encode([
        'success' => false,
        'message' => 'Código de barras não fornecido'
    ]);
    exit;
}

// Buscar produto
$produto_encontrado = null;
foreach ($produtos as $produto) {
    if ($produto['codigo_barras'] == $codigo_barras) {
        $produto_encontrado = $produto;
        break;
    }
}

if ($produto_encontrado) {
    echo json_encode([
        'success' => true,
        'produto' => $produto_encontrado
    ]);
} else {
    // Se não encontrou, simular consulta em API externa
    $produto_externo = consultarAPIExterna($codigo_barras);
    
    if ($produto_externo) {
        echo json_encode([
            'success' => true,
            'produto' => $produto_externo
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Produto não encontrado'
        ]);
    }
}

function consultarAPIExterna($codigo_barras) {
    // Exemplo de consulta a API externa
    // Você pode integrar com APIs como:
    // - Open Food Facts
    // - Google Product Search
    // - Sua própria base de dados
    
    $url = "https://world.openfoodfacts.org/api/v0/product/$codigo_barras.json";
    
    $context = stream_context_create([
        'http' => ['timeout' => 5]
    ]);
    
    $response = @file_get_contents($url, false, $context);
    
    if ($response !== false) {
        $data = json_decode($response, true);
        
        if ($data['status'] == 1) {
            $product = $data['product'];
            return [
                'codigo_barras' => $codigo_barras,
                'nome' => $product['product_name'] ?? 'Produto não identificado',
                'marca' => $product['brands'] ?? 'Marca não informada',
                'categoria' => $product['categories'] ?? 'Categoria não informada',
                'imagem' => $product['image_url'] ?? '',
                'fonte' => 'open_food_facts'
            ];
        }
    }
    
    return null;
}
?>