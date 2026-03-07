import { motion } from 'framer-motion';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: boolean;
}

const Skeleton = ({ width = '100%', height = '20px', className = '', rounded = false }: SkeletonProps) => {
  return (
    <motion.div
      className={`skeleton ${rounded ? 'rounded' : ''} ${className}`}
      style={{ width, height }}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};

export const SkeletonCard = () => (
  <div className="skeleton-card">
    <Skeleton height="40px" width="60px" rounded />
    <div className="skeleton-content">
      <Skeleton height="20px" width="80%" />
      <Skeleton height="16px" width="60%" />
      <Skeleton height="16px" width="40%" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="skeleton-table">
    <div className="skeleton-table-header">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} height="20px" width="100%" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="skeleton-table-row">
        {Array.from({ length: 6 }).map((_, j) => (
          <Skeleton key={j} height="16px" width="90%" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonChart = () => (
  <div className="skeleton-chart">
    <Skeleton height="24px" width="200px" className="chart-title" />
    <div className="chart-content">
      <div className="chart-bars">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="chart-bar">
            <Skeleton 
              height={`${Math.random() * 200 + 50}px`} 
              width="40px" 
              className="bar-fill"
            />
            <Skeleton height="16px" width="30px" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default Skeleton;





