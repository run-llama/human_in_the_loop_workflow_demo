"use client"
import React, { ReactNode } from 'react'
import { StreamableValue, useStreamableValue } from 'ai/rsc'

export const Report: React.FC<{
  input: string
  output: StreamableValue<string>
}> = ({ input, output }) => {
  const [value] = useStreamableValue(output)
  return (
    <div>
      <p>Report for {input}</p>
      {value}
    </div>
  )
}