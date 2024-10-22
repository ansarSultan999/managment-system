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
      } else {
        setCurrentTeam(null);
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
        await setDoc(doc(db, "users", memberId), { teams: docRef.id }, { merge: true });
      };

      await Promise.all(selectedTeamMembers.map(updateMembers));
      await setDoc(doc(db, "users", currentUser.id), { teams: docRef.id }, { merge: true });

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

  // Show HTML response  
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
              <div className="mt-4 flex flex-wrap">
                <h3 className="font-semibold w-full">Team Members:</h3>
                <div className="flex flex-col flex-wrap space-x-4">
                  {availableTeamMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2 ml-0 mb-5">
                      <Avatar>
                        <AvatarImage
                          src={member.photoURL || `https://api.dicebear.com/6.x/initials/svg?seed=${member.name}`}
                          alt={member.name}
                        />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{member.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="tasks">
              <div className="flex justify-between mb-4">
                <Input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button onClick={() => setShowAddTaskDialog(true)}>Add Task</Button>
              </div>
              {filteredTasks.map((task) => (
                <Card key={task.id} className="mb-4">
                  <CardHeader>
                    <CardTitle>{task.title}</CardTitle>
                    <p>{getSafeHtml(task.description)}</p>
                    <div className="flex space-x-2 mt-2">
                      {task.assignees.map((assigneeId) => {
                        const assignee = users.find((user) => user.id === assigneeId);
                        return (
                          <Avatar key={assigneeId}>
                            <AvatarImage
                              src={assignee?.photoURL || `https://api.dicebear.com/6.x/initials/svg?seed=${assignee?.name}`}
                              alt={assignee?.name}
                            />
                            <AvatarFallback>{assignee?.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        );
                      })}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => updateTaskStatus(task.id)}>
                      {task.status === "todo" ? "Mark as Done" : "Reopen"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>

          <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <div className="mb-4">
                <Label>Title</Label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <Label>Description</Label>
                <ReactQuill
                  value={newTaskDescription}
                  onChange={(value) => setNewTaskDescription(value)}
                />
              </div>
              <div className="mb-4">
                <Label>Assign Members:</Label>
                <div className="flex flex-wrap space-x-4">
                  {availableTeamMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        checked={assignedMembers.includes(member.id)}
                        onChange={() => {
                          if (assignedMembers.includes(member.id)) {
                            setAssignedMembers(assignedMembers.filter((id) => id !== member.id));
                          } else {
                            setAssignedMembers([...assignedMembers, member.id]);
                          }
                        }}
                      />
                      <span>{member.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addTask}>Create Task</Button>
                <Button variant="outline" onClick={() => setShowAddTaskDialog(false)}>Cancel</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
              </DialogHeader>
              <div className="mb-4">
                <Label>Team Name</Label>
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>
              <Label>Select Members:</Label>
              <div className="flex flex-wrap space-x-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTeamMembers.includes(user.id)}
                      onChange={() => {
                        if (selectedTeamMembers.includes(user.id)) {
                          setSelectedTeamMembers(selectedTeamMembers.filter((id) => id !== user.id));
                        } else {
                          setSelectedTeamMembers([...selectedTeamMembers, user.id]);
                        }
                      }}
                    />
                    <span>{user.name}</span>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={createTeam}>Create Team</Button>
                <Button variant="outline" onClick={() => setShowCreateTeam(false)}>Cancel</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
