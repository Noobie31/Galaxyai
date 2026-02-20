import React from 'react';

const WorkflowCard = ({ name, updatedAt }: { name: string; updatedAt: string }) => {
    return (
        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white">
            <h3 className="font-semibold text-lg">{name}</h3>
            <p className="text-sm text-stone-500">Last updated: {updatedAt}</p>
        </div>
    );
};

export default WorkflowCard;
