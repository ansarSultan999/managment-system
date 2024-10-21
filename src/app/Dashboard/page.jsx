"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic"; 
import DOMPurify from 'dompurify'; 
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { db, auth } from "../database/firebase-config"; // Adjust the import based on your file structure
import { signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import "react-quill/dist/quill.snow.css"; // Import Quill CSS
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false }); // Dynamically import Quill

export default function FixedTeamTaskManagement() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [assignedMembers, setAssignedMembers] = useState([]);
  const router = useRouter();

  // Fetch users from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const userList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(userList);
    });
    return () => unsubscribe();
  }, []);

  // Fetch teams from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "teams"), (snapshot) => {
      const teamList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeams(teamList);
    });
    return () => unsubscribe();
  }, []);

  // Fetch tasks from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tasks"), (snapshot) => {
      const taskList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(taskList);
    });
    return () => unsubscribe();
  }, []);

  // Fetch current user on component mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser({ id: user.uid, name: user.displayName || user.email });
        fetchUserTeams(user.uid); // Fetch teams associated with the user
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);


  // Fetch teams for the current user
  const fetchUserTeams = async (userId) => {
    const q = query(collection(db, "teams"), where("members", "array-contains", userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teamList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (teamList.length > 0) {
        setCurrentTeam(teamList[0]); // Set the first team as current (or handle accordingly)
      }
    });
    return () => unsubscribe();
  };

  // Create a team and assign members
  const createTeam = async () => {
    if (!currentUser || !currentUser.id) {
      alert("No user is logged in. Please sign in before creating a team.");
      return;
    }

    if (newTeamName.trim() && selectedTeamMembers.length > 0) {
      const newTeam = {
        name: newTeamName,
        createdBy: currentUser.id,
        members: [currentUser.id, ...selectedTeamMembers],
      };

      const docRef = await addDoc(collection(db, "teams"), newTeam);

      // Update user team data for selected members
      const updateMembers = async (memberId) => {
        await setDoc(doc(db, "users", memberId), { team: docRef.id }, { merge: true });
      };

      await Promise.all(selectedTeamMembers.map(updateMembers));
      await setDoc(doc(db, "users", currentUser.id), { team: docRef.id }, { merge: true });

      setNewTeamName("");
      setSelectedTeamMembers([]);
      setShowCreateTeam(false);
      setCurrentTeam({ id: docRef.id, name: newTeam.name, members: newTeam.members });
    } else {
      alert("Please enter a team name and select at least one member.");
    }
  };

  // Add a new task
  const addTask = async () => {
    if (newTaskTitle.trim() && newTaskDescription.trim()) {
      const newTask = {
        title: newTaskTitle,
        description: newTaskDescription,
        createdBy: currentUser.id,
        assignees: assignedMembers,
        team: currentTeam.id,
        status: "todo",
      };
      await addDoc(collection(db, "tasks"), newTask);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setAssignedMembers([]);
      setShowAddTaskDialog(false);
    } else {
      alert("Please enter a title and description for the task.");
    }
  };

//show html response  
const getSafeHtml = (html) => {
  return DOMPurify.sanitize(html); // Sanitize the HTML
};

  // Toggle task assignment
  const toggleTaskAssignment = async (taskId, userId) => {
    const task = tasks.find((task) => task.id === taskId);
    if (!task) return; // Safety check

    const updatedAssignees = task.assignees.includes(userId)
      ? task.assignees.filter((id) => id !== userId)
      : [...task.assignees, userId];

    await setDoc(doc(db, "tasks", taskId), { assignees: updatedAssignees }, { merge: true });
  };

  // Update task status
  const updateTaskStatus = async (taskId) => {
    const task = tasks.find((task) => task.id === taskId);
    if (!task) return; // Safety check

    const newStatus = task.status === "todo" ? "done" : "todo";
    await setDoc(doc(db, "tasks", taskId), { status: newStatus }, { merge: true });
  };

  // Filter tasks for the current team
  const filteredTasks = tasks.filter(
    (task) =>
      task.team === currentTeam?.id &&
      task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get available team members for task assignment
  const availableTeamMembers = users.filter((user) => 
    user.id !== currentUser?.id && currentTeam?.members.includes(user.id)
  );

  // Handle logout
  const handleLogout = async () => {
    await signOut(auth);
    router.push("/Login");
  };

  return (
    <div className="container mx-auto p-4">
      {!currentTeam ? (
        <Card>
          <CardHeader>
            <CardTitle>Create or Join a Team</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowCreateTeam(true)}>Create a New Team</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <header className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Fixed Team Task Management</h1>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={currentUser ? `https://api.dicebear.com/6.x/initials/svg?seed=${currentUser.name}` : ""} />
                <AvatarFallback>{currentUser ? currentUser.name.charAt(0) : "?"}</AvatarFallback>
              </Avatar>
              <span>{currentUser ? currentUser.name : "Guest"}</span>
              <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </div>
          </header>
          <Tabs defaultValue="teams" className="w-full">
            <TabsList>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>
            <TabsContent value="teams">
              <h2 className="text-xl font-semibold mb-4">Current Team: {currentTeam.name}</h2>
              <h3 className="text-lg mb-2">Members:</h3>
              <ul>
                {currentTeam.members.map((memberId) => {
                  const member = users.find((user) => user.id === memberId);
                  return (
                    <li key={memberId} className="flex items-center py-2">
                      <Avatar>
                        <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${member.name}`} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="ml-2">{member.name}</span>
                    </li>
                  );
                })}
              </ul>
              <Button onClick={() => setShowAddTaskDialog(true)} className="mt-4">Add Task</Button>
              <Input
                placeholder="Search Tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-4"
              />
            </TabsContent>
            <TabsContent value="tasks">
              <ul>
                {filteredTasks.map((task) => (
                  <li key={task.id} className="flex justify-between items-center border-b py-2">
                    <div>
                      <h3 className="font-bold">{task.title}</h3>
                      <div
                        className="description"
                        dangerouslySetInnerHTML={{ __html: getSafeHtml(task.description) }} 
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <Button onClick={() => updateTaskStatus(task.id)}>
                        {task.status === "todo" ? "Mark as Done" : "Undo"}
                      </Button>
                      <div>
                        {task.assignees.map((assigneeId) => {
                          const assignee = users.find(user => user.id === assigneeId); // Find user by ID
                          return assignee ? (
                            <ul key={assignee.id} className="text-sm"><li>{assignee.name}</li></ul> // Display user name
                          ) : null; // Return null if the user is not found
                        })}
                      </div>

                    </div>
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>

          {/* Add Task Dialog */}
          <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Task Title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="mb-4"
              />
              <Label>Description</Label>
              <ReactQuill
                value={newTaskDescription}
                onChange={setNewTaskDescription}
                className="mb-4"
              />
              <Label>Assign Members</Label>
              <ul>
                {availableTeamMembers.map((user) => (
                  <li key={user.id} className="flex items-center">
                    <Checkbox
                      checked={assignedMembers.includes(user.id)}
                      onCheckedChange={(checked) => {
                        setAssignedMembers((prev) =>
                          checked ? [...prev, user.id] : prev.filter((id) => id !== user.id)
                        );
                      }}
                    />
                    <span className="ml-2">{user.name}</span>
                  </li>
                ))}
              </ul>
              <DialogFooter>
                <Button onClick={addTask}>Create Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Team Dialog */}
          <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Team Name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="mb-4"
              />
              <Label>Select Members</Label>
              <ul>
                {users
                  .filter(user => user.id !== currentUser?.id) // Exclude the current user
                  .map(user => (
                    <li key={user.id} className="flex items-center">
                      <Checkbox
                        checked={selectedTeamMembers.includes(user.id)}
                        onCheckedChange={(checked) => {
                          setSelectedTeamMembers((prev) =>
                            checked ? [...prev, user.id] : prev.filter((id) => id !== user.id)
                          );
                        }}
                      />
                      <span className="ml-2">{user.name}</span>
                    </li>
                  ))}
              </ul>
              <DialogFooter>
                <Button onClick={createTeam}>Create Team</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
