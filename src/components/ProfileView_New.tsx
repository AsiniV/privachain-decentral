import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'

export function ProfileView() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="flex-1 p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Profile view placeholder - rebuilding component</p>
          <Button onClick={() => setActiveTab('profile')}>
            Test Button
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}