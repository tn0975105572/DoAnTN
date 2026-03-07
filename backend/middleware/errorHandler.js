module.exports = (err, req, res, next) => {
    console.error('❌ Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query
    });

    // Lỗi validation
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: err.errors
        });
    }

    // Lỗi database
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            message: 'Dữ liệu đã tồn tại'
        });
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            success: false,
            message: 'Tham chiếu không hợp lệ'
        });
    }

    // Lỗi JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token đã hết hạn'
        });
    }

    // Lỗi file upload
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File quá lớn'
        });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            success: false,
            message: 'File không được hỗ trợ'
        });
    }

    // Lỗi server chung
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Lỗi server nội bộ';

    res.status(statusCode).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Lỗi server nội bộ' : message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};