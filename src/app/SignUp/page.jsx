"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db } from "../database/firebase-config";
import { setDoc, doc } from "firebase/firestore";
import { auth } from "../database/firebase-config";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const signUp = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save user info to Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        team: null, // User is not part of a team yet
      });

      router.push("/Dashboard"); // Redirect to the main dashboard after signing up
    } catch (error) {
      console.error("Error signing up: ", error);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100 ">
      <Card className="w-1/3">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={signUp} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit">Sign Up</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
