"use client";

import React from "react";
import SimpleZapierBuilder from "@/components/learning/simple-zapier-builder";

export default function TestBuilderPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-8">
          Test Activity Builder
        </h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <SimpleZapierBuilder courseId="test-course" />
        </div>
      </div>
    </div>
  );
}
