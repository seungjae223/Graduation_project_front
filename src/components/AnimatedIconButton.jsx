import UseAnimations from "react-useanimations";

export default function AnimatedIconButton({
  as: Control = "button",
  type = "button",
  animation,
  iconSize = 24,
  iconClassName,
  iconWrapClassName,
  children,
  disabled,
  onClick,
  ...props
}) {
  return (
    <UseAnimations animation={animation} size={iconSize} interaction="click-replay" speed={1.35}
      render={({ onClick: replay }, iconProps) => {
        const icon = <span {...iconProps} className={iconClassName} />;
        return (
          <Control {...props} type={Control === "button" ? type : undefined} disabled={disabled}
            onClick={event => { replay(event); onClick?.(event); }}
            onPointerEnter={event => { if (!disabled && event.pointerType === "mouse") replay(event); }}
            onFocus={event => { if (event.currentTarget.matches(":focus-visible")) replay(event); }}>
            {iconWrapClassName ? <span className={iconWrapClassName}>{icon}</span> : icon}
            {children}
          </Control>
        );
      }}
    />
  );
}
