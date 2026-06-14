/// src/lib/validation.ts

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const passwordRegex = /^(?=.*[0-9])[A-Z].{5,}$/
export const phoneRegex = /^[0-9]{10,15}$/
export const usernameRegex = /^[a-zA-Z0-9_]{3,}$/
