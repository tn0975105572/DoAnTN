import './Products.css';

const products = [
    { id: 1, name: 'Sản phẩm A', price: '500.000đ', image: '📱' },
    { id: 2, name: 'Sản phẩm B', price: '750.000đ', image: '💻' },
    { id: 3, name: 'Sản phẩm C', price: '1.200.000đ', image: '🎧' },
    { id: 4, name: 'Sản phẩm D', price: '2.500.000đ', image: '⌚' },
    { id: 5, name: 'Sản phẩm E', price: '3.000.000đ', image: '📷' },
    { id: 6, name: 'Sản phẩm F', price: '4.500.000đ', image: '🖥️' },
];

const Products = () => {
    return (
        <div className="products-page">
            <h1 className="page-title">Sản phẩm</h1>

            <div className="products-grid">
                {products.map((product) => (
                    <div key={product.id} className="product-card">
                        <div className="product-image">{product.image}</div>
                        <h3 className="product-name">{product.name}</h3>
                        <p className="product-price">{product.price}</p>
                        <button className="add-to-cart-btn">Thêm vào giỏ</button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Products;
