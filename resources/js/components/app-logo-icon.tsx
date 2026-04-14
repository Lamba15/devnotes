import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(
    props: ImgHTMLAttributes<HTMLImageElement>,
) {
    return (
        <img
            {...props}
            alt={props.alt ?? 'devnotes'}
            src="/branding/my-logo.svg"
        />
    );
}
