import { ChangeEvent, CSSProperties } from "react";
import styles from "./Slider.module.css";

type SliderProps = {
    min: number;
    max: number;
    step?: number;
    value: number;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    ariaLabel: string;
    className?: string;
};

const Slider = ({
    min,
    max,
    step,
    value,
    onChange,
    disabled,
    ariaLabel,
    className,
}: SliderProps) => {
    const range = max - min;
    const normalizedValue = range > 0 ? ((value - min) / range) * 100 : 0;
    const clampedValue = Math.max(0, Math.min(100, normalizedValue));

    const style = {
        "--slider-value": `${clampedValue}%`,
    } as CSSProperties;

    const sliderClassName = className
        ? `${styles.slider} ${className}`
        : styles.slider;

    return (
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            disabled={disabled}
            aria-label={ariaLabel}
            className={sliderClassName}
            style={style}
        />
    );
};

export default Slider;
