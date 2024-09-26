'use client'

import React from 'react'

export const Retry: React.FC<{
  placeholder: string
}> = ({ placeholder }) => {
  return (
    <span>
      Please try again:
      {placeholder}
    </span>
  )
}