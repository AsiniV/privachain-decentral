import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { IntegrationTestPanel } from './IntegrationTestPanel'

export function ProfileView() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="flex-1 p-6 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="integration">Integration Tests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Gear</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Profile view placeholder - rebuilding component</p>
              <Button onClick={() => setActiveTab('integration')}>
                View Integration Tests
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="integration" className="space-y-6">
          <IntegrationTestPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}