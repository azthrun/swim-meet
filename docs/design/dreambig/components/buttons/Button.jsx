import React from 'react';
import { Icon } from '../icons/Icon.jsx';

const dbButtonBase = {
  font: 'var(--type-button)',
  fontFamily: 'var(--font-sans)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  border: '1px solid transparent',
  cursor: 'pointer',
  transition: 'var(--transition-press), var(--transition-surface)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

const dbButtonVariants = {
  primary: {
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    borderRadius: 'var(--radius-full)',
  },
  secondary: {
    background: 'var(--surface-card)',
    color: 'var(--text-body)',
    borderRadius: 'var(--radius-full)',
    boxShadow: 'var(--shadow-soft)',
  },
  utility: {
    background: 'var(--surface-card)',
    color: 'var(--text-body)',
    borderRadius: 'var(--radius-button-utility)',
    borderColor: 'var(--border-hairline)',
  },
};

const dbButtonSizes = {
  sm: { padding: '4px 14px' },
  md: { padding: '9px 20px' },
  lg: { padding: '13px 28px' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  trailingIcon,
  disabled = false,
  pressed = false,
  href,
  fullWidth = false,
  children,
  style,
  ...rest
}) {
  const [down, setDown] = React.useState(false);
  const active = pressed || down;
  const isPill = variant !== 'utility';
  const variantStyle = { ...dbButtonVariants[variant] };
  if (active && variant === 'primary') variantStyle.background = 'var(--color-primary-active)';
  if (active && variant === 'utility') variantStyle.background = 'var(--canvas)';
  const composed = {
    ...dbButtonBase,
    ...variantStyle,
    ...(variant === 'utility' ? dbButtonSizes.sm : dbButtonSizes[size]),
    ...(active ? { transform: isPill ? 'scale(var(--press-scale))' : 'scale(var(--press-scale-subtle))' } : null),
    ...(disabled ? { opacity: 0.4, cursor: 'not-allowed' } : null),
    ...(fullWidth ? { width: '100%' } : null),
    ...style,
  };
  const Tag = href ? 'a' : 'button';
  return (
    <Tag
      href={href}
      disabled={Tag === 'button' ? disabled : undefined}
      onPointerDown={() => !disabled && setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      style={composed}
      {...rest}
    >
      {icon ? <Icon name={icon} size={variant === 'utility' ? 16 : 18} /> : null}
      {children}
      {trailingIcon ? <Icon name={trailingIcon} size={variant === 'utility' ? 16 : 18} /> : null}
    </Tag>
  );
}
