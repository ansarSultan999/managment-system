"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth, db } from "../database/firebase-config";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState(null);
  const router = useRouter();

  // Redirect user if already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchUserTeamAndTasks(user.uid);
        router.push("/Dashboard"); // Redirect if logged in
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserTeamAndTasks = async (userId) => {
    // Fetch the team and tasks for the logged-in user
    const teamQuery = query(collection(db, "users"), where("id", "==", userId));
    const unsubscribe = onSnapshot(teamQuery, (snapshot) => {
      const userData = snapshot.docs[0]?.data();
      setTeam(userData?.team);

      // Fetch tasks assigned to this user if part of a team
      if (userData?.team) {
        const taskQuery = query(
          collection(db, "tasks"),
          where("assignees", "array-contains", userId)
        );
        onSnapshot(taskQuery, (taskSnapshot) => {
          const taskList = taskSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTasks(taskList);
        });
      } else {
        setTasks([]); // Clear tasks if no team
      }
    });

    return () => unsubscribe();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Firebase login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      setCurrentUser(user);
      fetchUserTeamAndTasks(user.uid);

      // Redirect to the Dashboard page upon successful login
      router.push("/Dashboard");
    } catch (error) {
      setError("Invalid email or password. Please try again.");
    }
  };

  const renderTasks = () => {
    if (tasks.length === 0) {
      return <p>No tasks assigned to you.</p>;
    }
    return tasks.map((task) => (
      <div key={task.id}>
        <h3>{task.title}</h3>
        <p>Status: {task.status}</p>
      </div>
    ));
  };

  const renderCreateTeamOption = () => {
    if (!team) {
      return (
        <Button onClick={() => router.push("/create-team")}>Create a Team</Button>
      );
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <Card className="w-full max-w-md p-4 shadow-lg">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-600">{error}</p>}
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
          
        </CardContent>
      </Card>
    </div>
  );
}
